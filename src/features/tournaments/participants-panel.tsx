import type { RegistrationView, TournamentView } from '@kttf/shared/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';
import { useSessionStore } from '@/features/auth/session-store';
import { isClubStaff } from '@/features/clubs/roles';
import { playerName } from '@/features/players/player-name';

import AddParticipant from './add-participant';
import { removeRegistration, updateRegistration } from './api';
import { REGISTRATION_STATUS_KEYS } from './labels';
import { tournamentKeys } from './queries';

interface ParticipantsPanelProps {
  readonly tournament: TournamentView;
  readonly registrations: readonly RegistrationView[];
}

/**
 * Состав участников — ТЗ 4.3 и 4.4.
 *
 * Список открыт всем: кто заявился на турнир — такой же спортивный факт, как
 * и результаты. Органы управления показываются владельцу и организатору
 * клуба-хозяина (ADR-014); право всё равно проверяет сервер.
 *
 * Порядок задаёт сервер — посев, затем время записи. Пересортировывать на
 * клиенте нечего: посев и есть тот порядок, в котором участники войдут в
 * жеребьёвку.
 */
export default function ParticipantsPanel({
  tournament,
  registrations,
}: ParticipantsPanelProps): ReactNode {
  const t = useT();
  const user = useSessionStore((state) => state.user);
  const isStaff = isClubStaff(user, tournament.clubId);

  if (registrations.length === 0 && !isStaff) {
    return null;
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-slate-900">
        {t('participants.title')}{' '}
        <span className="text-base font-normal text-slate-500 tabular-nums">
          {registrations.length}
        </span>
      </h2>

      {isStaff && <AddParticipant tournament={tournament} registrations={registrations} />}

      {registrations.length === 0 ? (
        <p className="mt-3 text-slate-500">{t('participants.empty')}</p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th scope="col" className="py-2 font-normal">
                {t('participants.seed')}
              </th>
              <th scope="col" className="py-2 font-normal">
                {t('participants.player')}
              </th>
              <th scope="col" className="py-2 font-normal">
                {t('participants.rating')}
              </th>
              <th scope="col" className="py-2 font-normal">
                {t('participants.status')}
              </th>
              {isStaff && (
                <th scope="col" className="py-2 font-normal">
                  {t('participants.actions')}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {registrations.map((registration) => (
              <Row
                key={registration.id}
                tournament={tournament}
                registration={registration}
                isStaff={isStaff}
              />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function Row({
  tournament,
  registration,
  isStaff,
}: {
  readonly tournament: TournamentView;
  readonly registration: RegistrationView;
  readonly isStaff: boolean;
}): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();

  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
  };

  const update = useMutation({
    mutationFn: (input: Parameters<typeof updateRegistration>[2]) =>
      updateRegistration(tournament.id, registration.id, input),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: () => removeRegistration(tournament.id, registration.id),
    onSuccess: refresh,
  });

  const isWithdrawn = registration.status === 'WITHDRAWN' || registration.status === 'NO_SHOW';
  const error = update.error ?? remove.error;

  return (
    <tr className="border-b border-slate-100 align-top">
      <td className="py-2 tabular-nums text-slate-500">{registration.seed ?? '—'}</td>
      <td className="py-2 text-slate-900">
        <Link
          to="/players/$playerId"
          params={{ playerId: registration.player.id }}
          className="text-blue-700 underline"
        >
          {playerName(registration.player)}
        </Link>
        {!registration.isRated && (
          // Вне зачёта: играет, но результаты не рейтинговые — ТЗ 4.4.
          <span className="ml-2 text-xs text-slate-500">{t('participants.unrated')}</span>
        )}
        {error !== null && (
          <span role="alert" className="mt-1 block text-xs text-red-700">
            {t(errorMessageKey(error))}
          </span>
        )}
      </td>
      <td className="py-2 tabular-nums text-slate-600">
        {/* Рейтинг на старте, если турнир начат: он и пошёл в расчёт (ТС 5.4). */}
        {registration.ratingAtStart ?? registration.player.rating}
      </td>
      <td className="py-2 text-slate-600">{t(REGISTRATION_STATUS_KEYS[registration.status])}</td>
      {isStaff && (
        <td className="py-2">
          <div className="flex flex-wrap gap-3 text-xs">
            <button
              type="button"
              disabled={update.isPending}
              onClick={() => {
                update.mutate({ isRated: !registration.isRated });
              }}
              className="text-blue-700 underline disabled:text-slate-400"
            >
              {registration.isRated ? t('participants.markUnrated') : t('participants.markRated')}
            </button>

            <button
              type="button"
              disabled={update.isPending}
              onClick={() => {
                update.mutate({ status: isWithdrawn ? 'CONFIRMED' : 'WITHDRAWN' });
              }}
              className="text-blue-700 underline disabled:text-slate-400"
            >
              {isWithdrawn ? t('participants.restore') : t('participants.withdraw')}
            </button>

            {/* Удалить запись можно только до старта: после него участник
                снимается, а не исчезает — его встречи уже в таблице (ADR-009). */}
            {tournament.startedAt === null && (
              <button
                type="button"
                disabled={remove.isPending}
                onClick={() => {
                  remove.mutate();
                }}
                className="text-blue-700 underline disabled:text-slate-400"
              >
                {t('participants.remove')}
              </button>
            )}

            <label className="flex items-center gap-1 text-slate-500">
              {t('participants.seed')}
              <input
                type="number"
                min={1}
                defaultValue={registration.seed ?? ''}
                onBlur={(event) => {
                  const raw = event.target.value.trim();
                  const seed = raw === '' ? null : Number(raw);

                  if (seed === registration.seed || (seed !== null && !Number.isInteger(seed))) {
                    return;
                  }

                  update.mutate({ seed });
                }}
                className="w-14 rounded border border-slate-300 px-1 py-0.5 tabular-nums"
              />
            </label>
          </div>
        </td>
      )}
    </tr>
  );
}
