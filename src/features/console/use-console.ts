import type { MatchResultInput, TieDecisionInput, TournamentSnapshotView } from '@kttf/shared/types';
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import { finishTournament } from './api';
import type { OutboxItem } from './db';
import { applyOperation } from './offline-state';
import { enqueue, forget, newOperation, pending, rejectedItems, type NewOperation } from './outbox';
import { loadState, syncTournament } from './sync';

export const consoleKeys = {
  state: (tournamentId: string) => ['console', 'state', tournamentId] as const,
  queue: (tournamentId: string) => ['console', 'queue', tournamentId] as const,
  running: ['console', 'running'] as const,
};

/** Как часто консоль отправляет очередь при наличии сети — ТС 6.3. */
const SYNC_INTERVAL_MS = 15_000;

/**
 * Снимок турнира.
 *
 * Читается сначала с диска, потом из сети (ТС 6.1): судья открывает консоль в
 * зале, где сети может не быть вовсе, и снимок с прошлого раза для него
 * полезнее спиннера.
 *
 * Опроса по таймеру нет: свежее состояние приносит синхронизация, и она же
 * отдаёт серверу очередь. Отдельный опрос перетирал бы только что введённое.
 */
export function consoleStateQuery(tournamentId: string) {
  return queryOptions({
    queryKey: consoleKeys.state(tournamentId),
    queryFn: () => loadState(tournamentId),
    staleTime: Infinity,
  });
}

/** Три состояния индикатора связи — ТС 6.4. */
export type ConnectionState = 'SYNCED' | 'SYNCING' | 'OFFLINE';

export interface ConsoleQueue {
  readonly connection: ConnectionState;
  /** Сколько операций ждёт отправки. */
  readonly queued: number;
  /** Отклонённое сервером: судья обязан узнать, что именно не легло. */
  readonly rejected: readonly OutboxItem[];
  readonly syncNow: () => void;
  readonly dismiss: (seq: number) => void;
}

function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Консоль судьи в офлайн-режиме — ТЗ 6.4.
 *
 * Каждое действие судьи проходит один и тот же путь: экран меняется сразу,
 * операция ложится в очередь на диск, очередь уходит на сервер, когда есть
 * сеть. Путь один и в зале с интернетом, и без него — иначе офлайн оказался бы
 * режимом, который впервые проверяется в бою (запрет №1 брифа).
 *
 * Ответ сервера — снимок целиком. Поверх него накладывается всё, что ещё не
 * отправлено, поэтому синхронизация, случившаяся в момент ввода счёта, этот
 * счёт с экрана не стирает.
 */
export function useConsole(tournamentId: string) {
  const queryClient = useQueryClient();
  const stateKey = consoleKeys.state(tournamentId);
  const queueKey = consoleKeys.queue(tournamentId);

  const state = useQuery(consoleStateQuery(tournamentId));
  const queue = useQuery({
    queryKey: queueKey,
    queryFn: async () => ({
      queued: (await pending(tournamentId)).length,
      rejected: await rejectedItems(tournamentId),
    }),
    staleTime: 0,
  });

  const [online, setOnline] = useState(isOnline);

  const patch = useCallback(
    (change: (snapshot: TournamentSnapshotView) => TournamentSnapshotView) => {
      queryClient.setQueryData(stateKey, (snapshot: TournamentSnapshotView | undefined) =>
        snapshot === undefined ? snapshot : change(snapshot),
      );
    },
    [queryClient, stateKey],
  );

  const refreshQueue = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queueKey });
  }, [queryClient, queueKey]);

  const sync = useMutation({
    mutationFn: () => syncTournament(tournamentId),
    onSuccess: (outcome) => {
      queryClient.setQueryData(stateKey, outcome.snapshot);
      refreshQueue();
    },
    // Неудачная отправка — это отсутствие сети, а не ошибка судьи. Очередь
    // остаётся на диске, следующая попытка придёт сама.
    onError: refreshQueue,
  });

  const syncNow = useCallback(() => {
    if (!sync.isPending) sync.mutate();
  }, [sync]);

  /**
   * Действие судьи.
   *
   * Экран меняется **до** записи на диск и тем более до сети: между нажатием
   * и цифрой на экране не должно быть ничего асинхронного (ТС 8.1 — отклик
   * меньше 50 мс).
   */
  const push = useCallback(
    (operation: NewOperation) => {
      const prepared = newOperation(operation);

      patch((snapshot) => applyOperation(snapshot, prepared));

      void enqueue(tournamentId, prepared).then(() => {
        refreshQueue();

        if (isOnline()) syncNow();
      });
    },
    [patch, refreshQueue, syncNow, tournamentId],
  );

  // Сеть вернулась — очередь уходит сама, без участия судьи (ТС 6.3).
  useEffect(() => {
    const goOnline = (): void => {
      setOnline(true);
      syncNow();
    };
    const goOffline = (): void => {
      setOnline(false);
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [syncNow]);

  // Отправка по таймеру: каждые 15 секунд при наличии сети — ТС 6.3.
  useEffect(() => {
    const timer = setInterval(() => {
      if (isOnline()) syncNow();
    }, SYNC_INTERVAL_MS);

    return () => {
      clearInterval(timer);
    };
  }, [syncNow]);

  const finish = useMutation({
    mutationFn: () => finishTournament(tournamentId),
    onSuccess: () => {
      syncNow();
    },
  });

  const queued = queue.data?.queued ?? 0;

  return {
    state,
    /** Назначение встречи на стол — ТЗ 6.2. */
    assign: (matchId: string, tableNumber: number) => {
      push({ type: 'MATCH_ASSIGN', matchId, payload: { tableNumber } });
    },
    /** Ввод счёта и правка уже введённого — ТЗ 6.3. */
    result: (matchId: string, input: MatchResultInput, correcting: boolean) => {
      push({ type: correcting ? 'MATCH_EDIT' : 'MATCH_RESULT', matchId, payload: input });
    },
    /** Возврат встречи в очередь — ТЗ 6.3. */
    cancel: (matchId: string) => {
      push({ type: 'MATCH_CANCEL', matchId });
    },
    /**
     * Решение судьи по равенству — ADR-008.
     *
     * Оптимистично не применяется: места считает движок на сервере, и угадать
     * их здесь — второй расчёт таблицы на клиенте (запрет №2). До ближайшей
     * синхронизации таблица остаётся с прежними местами.
     */
    tie: (input: TieDecisionInput) => {
      push({ type: 'TIE_DECISION', payload: input });
    },
    finish,
    queue: {
      connection: !online ? 'OFFLINE' : sync.isPending ? 'SYNCING' : queued > 0 ? 'SYNCING' : 'SYNCED',
      queued,
      rejected: queue.data?.rejected ?? [],
      syncNow,
      dismiss: (seq: number) => {
        void forget(seq).then(refreshQueue);
      },
    } satisfies ConsoleQueue,
  };
}
