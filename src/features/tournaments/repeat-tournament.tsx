import type { TournamentView } from '@kttf/shared/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';
import { useSessionStore } from '@/features/auth/session-store';
import { isClubStaff } from '@/features/clubs/roles';

import { duplicateTournament } from './api';
import { tournamentKeys } from './queries';

/**
 * «Повторить прошлый турнир» — ТЗ 4.2, обязательный механизм.
 *
 * Клуб проводит турнир восемь раз в месяц, и каждый раз это те же настройки
 * с другой датой. Приоритет №4 брифа — простота создания турнира: разница
 * между «повторить» и «заполнить форму заново» здесь и есть разница между
 * «пользуюсь» и «забросил».
 *
 * Копирует **сервер**: маршрут `duplicate` переносит все настройки сам.
 * Собирать тело создания из прочитанного турнира означало бы второе место,
 * где перечислены все поля, и первое же новое поле их развело бы.
 */
export default function RepeatTournament({
  tournament,
}: {
  readonly tournament: TournamentView;
}): ReactNode {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useSessionStore((state) => state.user);

  const [startsAt, setStartsAt] = useState('');

  const repeat = useMutation({
    mutationFn: () => duplicateTournament(tournament.id, { startsAt: toMoment(startsAt) }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
      await navigate({ to: '/tournaments/$tournamentId', params: { tournamentId: created.id } });
    },
  });

  // Право проверяет сервер (ТС 8.3); здесь это решает только, показывать ли
  // орган управления. Судье он не показывается: клуб ведут владелец и
  // организатор (ADR-014).
  if (!isClubStaff(user, tournament.clubId)) {
    return null;
  }

  return (
    <section className="mt-8 rounded border border-slate-200 p-4">
      <h2 className="text-lg font-semibold text-slate-900">{t('tournament.repeat.title')}</h2>
      <p className="mt-1 text-sm text-slate-600">{t('tournament.repeat.hint')}</p>

      <form
        className="mt-3 flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          repeat.mutate();
        }}
      >
        <label className="block text-sm">
          <span className="text-slate-700">{t('tournament.form.startsAt')}</span>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(event) => {
              setStartsAt(event.target.value);
            }}
            className="mt-1 block rounded border border-slate-300 px-3 py-2"
          />
        </label>

        <button
          type="submit"
          // Дата обязательна: копия без неё — тот же турнир в тот же день.
          disabled={startsAt === '' || repeat.isPending}
          className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
        >
          {repeat.isPending ? t('common.loading') : t('tournament.repeat.submit')}
        </button>
      </form>

      {repeat.error !== null && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {t(errorMessageKey(repeat.error))}
        </p>
      )}
    </section>
  );
}

/**
 * Местное время поля — в момент контракта.
 *
 * Без преобразования турнир, назначенный на полдень в Алматы, уехал бы на
 * шесть часов: поле отдаёт время без зоны, а контракт принимает ISO.
 */
function toMoment(value: string): string {
  return new Date(value).toISOString();
}
