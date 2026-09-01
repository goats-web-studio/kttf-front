import type { MatchResultInput, TieDecisionInput, TournamentResultsView } from '@kttf/shared/types';
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import {
  assignTable,
  cancelMatch,
  correctResult,
  decideTie,
  fetchConsoleState,
  finishTournament,
  submitResult,
} from './api';
import {
  applyUpdate,
  replaceMatch,
  withOptimisticAssign,
  withOptimisticCancel,
  withOptimisticResult,
} from './state';

export const consoleKeys = {
  state: (tournamentId: string) => ['console', 'state', tournamentId] as const,
  running: ['console', 'running'] as const,
};

/**
 * Снимок турнира для консоли.
 *
 * Опроса по таймеру нет намеренно: источник истины в зале — судья, и опрос
 * перетирал бы то, что он только что ввёл, ответом, который сервер ещё не
 * успел учесть. Снимок обновляется после действий и при возвращении в вкладку.
 */
export function consoleStateQuery(tournamentId: string) {
  return queryOptions({
    queryKey: consoleKeys.state(tournamentId),
    queryFn: () => fetchConsoleState(tournamentId),
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  });
}

/** Неотправленное действие судьи: ждёт повтора, а не молчаливого откота. */
export interface Failure {
  readonly id: number;
  readonly error: unknown;
  readonly again: () => void;
}

/**
 * Действия консоли над турниром.
 *
 * Все они применяются к снимку **до** ответа сервера — запрет №1 брифа: ввод
 * счёта, ожидающий сети, недопустим. По этой же причине отказ ничего не
 * откатывает: введённое судьёй остаётся на экране и попадает в список
 * неотправленных с кнопкой повтора. Молчаливый откат означал бы, что счёт
 * исчез сам, и судья узнает об этом в конце турнира.
 *
 * Полноценная очередь синхронизации с хранением на диске — спринт 4 (ТЗ 6.4).
 * Здесь её зачаток: список в памяти живёт до перезагрузки страницы.
 */
export function useConsole(tournamentId: string) {
  const queryClient = useQueryClient();
  const key = consoleKeys.state(tournamentId);
  const state = useQuery(consoleStateQuery(tournamentId));

  const [failures, setFailures] = useState<readonly Failure[]>([]);
  const nextId = useRef(1);

  const patch = useCallback(
    (change: (snapshot: TournamentResultsView) => TournamentResultsView) => {
      queryClient.setQueryData(key, (snapshot: TournamentResultsView | undefined) =>
        snapshot === undefined ? snapshot : change(snapshot),
      );
    },
    [queryClient, key],
  );

  const refresh = useCallback(() => {
    // Таблицы, места и продвижение считает сервер. После действия снимок
    // перезапрашивается целиком — считать то же самое на клиенте вторым
    // способом запрещено (запрет №2).
    void queryClient.invalidateQueries({ queryKey: key });
  }, [queryClient, key]);

  const remember = useCallback((error: unknown, again: () => void) => {
    const id = nextId.current;

    nextId.current += 1;
    setFailures((current) => [...current, { id, error, again }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setFailures((current) => current.filter((failure) => failure.id !== id));
  }, []);

  const assign = useMutation({
    mutationFn: ({ matchId, tableNumber }: { matchId: string; tableNumber: number }) =>
      assignTable(matchId, { tableNumber }),
    onMutate: ({ matchId, tableNumber }) => {
      patch((snapshot) =>
        withOptimisticAssign(snapshot, matchId, tableNumber, new Date().toISOString()),
      );
    },
    onSuccess: (match) => {
      patch((snapshot) => replaceMatch(snapshot, match));
    },
    onError: (error, variables) => {
      remember(error, () => {
        assign.mutate(variables);
      });
    },
  });

  const result = useMutation({
    mutationFn: ({
      matchId,
      input,
      correcting,
    }: {
      matchId: string;
      input: MatchResultInput;
      correcting: boolean;
    }) => (correcting ? correctResult(matchId, input) : submitResult(matchId, input)),
    onMutate: ({ matchId, input }) => {
      patch((snapshot) => withOptimisticResult(snapshot, matchId, input, new Date().toISOString()));
    },
    onSuccess: (update) => {
      patch((snapshot) => applyUpdate(snapshot, update));
      refresh();
    },
    onError: (error, variables) => {
      remember(error, () => {
        result.mutate(variables);
      });
    },
  });

  const cancel = useMutation({
    mutationFn: (matchId: string) => cancelMatch(matchId),
    onMutate: (matchId) => {
      patch((snapshot) => withOptimisticCancel(snapshot, matchId));
    },
    onSuccess: (update) => {
      patch((snapshot) => applyUpdate(snapshot, update));
      refresh();
    },
    onError: (error, matchId) => {
      remember(error, () => {
        cancel.mutate(matchId);
      });
    },
  });

  /**
   * Решение по равенству меняет места, а иногда открывает следующий этап.
   *
   * Оптимистично не применяется: места считает движок на сервере, и угадать
   * их здесь — это второй расчёт таблицы на клиенте.
   */
  const tie = useMutation({
    mutationFn: (input: TieDecisionInput) => decideTie(tournamentId, input),
    onSuccess: () => {
      refresh();
    },
  });

  const finish = useMutation({
    mutationFn: () => finishTournament(tournamentId),
    onSuccess: () => {
      refresh();
    },
  });

  return { state, assign, result, cancel, tie, finish, failures, dismiss };
}
