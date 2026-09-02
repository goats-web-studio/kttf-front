import { DEFAULT_PAGE_SIZE, type RegistrationView, type TournamentView } from '@kttf/shared/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';
import { playerName } from '@/features/players/player-name';
import { playersQuery } from '@/features/players/queries';

import { registerForTournament } from './api';
import { eligibilityProblems } from './eligibility-problems';
import { tournamentKeys } from './queries';

interface AddParticipantProps {
  readonly tournament: TournamentView;
  readonly registrations: readonly RegistrationView[];
}

/**
 * Ручное добавление участника организатором — ТЗ 4.3.
 *
 * Поиск по фамилии в базе платформы: у половины игроков клуба аккаунта нет
 * вовсе, их заводит организатор, и записывать их на турнир тоже ему.
 *
 * Заведение нового игрока прямо отсюда (ТЗ 4.3) не сделано: форма профиля
 * живёт в кабинете, и второй её экземпляр здесь означал бы два места, где
 * список полей обязан совпадать. Организатор заводит игрока в кабинете и
 * находит его тем же поиском.
 */
export default function AddParticipant({
  tournament,
  registrations,
}: AddParticipantProps): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');

  const found = useQuery({
    ...playersQuery({ page: 1, limit: DEFAULT_PAGE_SIZE, search }),
    enabled: search !== '',
  });

  const add = useMutation({
    mutationFn: (playerId: string) => registerForTournament(tournament.id, { playerId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
    },
  });

  // Уже записанных в выдаче не показываем: записать дважды сервер не даст,
  // а строка с кнопкой, которая всегда откажет, — ложное обещание.
  const registered = new Set(registrations.map((registration) => registration.player.id));
  const candidates = (found.data?.items ?? []).filter((player) => !registered.has(player.id));

  const problems = eligibilityProblems(add.error);

  return (
    <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-3">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(draft.trim());
        }}
      >
        <label className="block text-sm">
          <span className="text-slate-700">{t('participants.search')}</span>
          <input
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
            }}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 sm:w-64"
          />
        </label>
        <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm text-white">
          {t('participants.find')}
        </button>
      </form>

      {add.error !== null && (
        <div role="alert" className="mt-2 text-sm text-red-700">
          {problems.length === 0 ? (
            t(errorMessageKey(add.error))
          ) : (
            <ul>
              {problems.map((problem) => (
                <li key={problem}>{t(problem)}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {search !== '' && found.data !== undefined && (
        <ul className="mt-3 divide-y divide-slate-200">
          {candidates.length === 0 ? (
            <li className="py-2 text-sm text-slate-500">{t('ratings.empty')}</li>
          ) : (
            candidates.map((player) => (
              <li key={player.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-slate-900">
                  {playerName(player)}
                  <span className="ml-2 text-slate-500">{player.city}</span>
                  <span className="ml-2 tabular-nums text-slate-500">{player.rating}</span>
                </span>
                <button
                  type="button"
                  disabled={add.isPending}
                  onClick={() => {
                    add.mutate(player.id);
                  }}
                  className="text-blue-700 underline disabled:text-slate-400"
                >
                  {t('participants.add')}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
