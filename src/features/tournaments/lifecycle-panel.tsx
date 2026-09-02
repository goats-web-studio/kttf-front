import type { ClubCollisionView, DrawResult, TournamentView } from '@kttf/shared/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT, type MessageKey } from '@/common/i18n';
import { useSessionStore } from '@/features/auth/session-store';
import { isClubStaff } from '@/features/clubs/roles';

import {
  cancelTournament,
  closeRegistration,
  drawTournament,
  finishTournament,
  openRegistration,
  publishTournament,
  startTournament,
} from './api';
import { availableActions, type LifecycleAction } from './lifecycle';
import { TOURNAMENT_STATUS_KEYS } from './labels';
import { tournamentKeys } from './queries';

interface LifecyclePanelProps {
  readonly tournament: TournamentView;
  /** Имена игроков: несведённые одноклубники приходят идентификаторами. */
  readonly names: ReadonlyMap<string, string>;
}

/** Жеребьёвка отвечает расстановкой, остальные действия — самим турниром. */
type ActionResult = DrawResult | TournamentView;

const ACTION_LABELS: Readonly<Record<LifecycleAction, MessageKey>> = {
  publish: 'lifecycle.publish',
  openRegistration: 'lifecycle.openRegistration',
  closeRegistration: 'lifecycle.closeRegistration',
  draw: 'lifecycle.draw',
  start: 'lifecycle.start',
  rate: 'lifecycle.rate',
  cancel: 'lifecycle.cancel',
};

/** Подсказка, объясняющая шаг. Не у каждого состояния она есть. */
const HINTS: Partial<Readonly<Record<TournamentView['status'], MessageKey>>> = {
  DRAFT: 'lifecycle.hint.DRAFT',
  REG_CLOSED: 'lifecycle.hint.REG_CLOSED',
  FINISHED: 'lifecycle.hint.FINISHED',
};

function perform(id: string, action: LifecycleAction): Promise<ActionResult> {
  switch (action) {
    case 'publish':
      return publishTournament(id);
    case 'openRegistration':
      return openRegistration(id);
    case 'closeRegistration':
      return closeRegistration(id);
    case 'draw':
      return drawTournament(id);
    case 'start':
      return startTournament(id);
    case 'rate':
      return finishTournament(id);
    case 'cancel':
      return cancelTournament(id);
  }
}

/**
 * Проведение турнира организатором — ТЗ 4.1.
 *
 * Здесь турнир проходит путь от черновика до старта: публикация, запись,
 * жеребьёвка, начало. Дальше его ведёт консоль судьи. Без этой панели
 * заведённый в интерфейсе турнир остаётся черновиком навсегда, а критерий
 * готовности MVP требует, чтобы организатор провёл второй турнир, не открывая
 * инструкцию, — не говоря уже о `curl`.
 *
 * Показывается только тому, кто ведёт клуб-хозяин (ADR-014). Право всё равно
 * проверяет сервер, и он же стережёт условия сверх статуса: старт без
 * жеребьёвки и завершение с несыгранными встречами он отвергает.
 */
export default function LifecyclePanel({ tournament, names }: LifecyclePanelProps): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const user = useSessionStore((state) => state.user);

  const [collisions, setCollisions] = useState<readonly ClubCollisionView[] | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const run = useMutation({
    mutationFn: (action: LifecycleAction) => perform(tournament.id, action),
    onSuccess: async (result) => {
      // Несведённые одноклубники приходят только от жеребьёвки и только один
      // раз: перечитать их потом неоткуда, поэтому они держатся здесь до
      // следующего действия (ADR-011).
      setCollisions('clubCollisions' in result ? result.clubCollisions : null);
      setConfirmingCancel(false);
      await queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
    },
  });

  if (!isClubStaff(user, tournament.clubId)) {
    return null;
  }

  const actions = availableActions(tournament.status);
  const hint = HINTS[tournament.status];

  return (
    <section className="mt-8 rounded border border-slate-300 bg-slate-50 p-4">
      <h2 className="text-lg font-semibold text-slate-900">{t('lifecycle.title')}</h2>

      <p className="mt-1 text-sm text-slate-600">
        {t('lifecycle.status')}: {t(TOURNAMENT_STATUS_KEYS[tournament.status])}
      </p>

      {hint !== undefined && <p className="mt-2 text-sm text-slate-600">{t(hint)}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {actions.map((action) =>
          action === 'cancel' ? null : (
            <button
              key={action}
              type="button"
              disabled={run.isPending}
              onClick={() => {
                run.mutate(action);
              }}
              className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-400"
            >
              {t(ACTION_LABELS[action])}
            </button>
          ),
        )}

        {/* Консоль — следующий шаг после старта. Ссылка, а не кнопка: судья
            открывает её на своём устройстве и остаётся в ней весь турнир. */}
        {tournament.status === 'RUNNING' && (
          <Link
            to="/console/$tournamentId"
            params={{ tournamentId: tournament.id }}
            className="text-sm text-blue-700 underline"
          >
            {t('lifecycle.console')}
          </Link>
        )}

        {actions.includes('cancel') &&
          (confirmingCancel ? (
            <span className="flex items-center gap-3 text-sm">
              <span className="text-slate-700">{t('lifecycle.cancelConfirm')}</span>
              <button
                type="button"
                disabled={run.isPending}
                onClick={() => {
                  run.mutate('cancel');
                }}
                className="text-red-700 underline disabled:text-slate-400"
              >
                {t('lifecycle.cancelYes')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmingCancel(false);
                }}
                className="text-slate-600 underline"
              >
                {t('lifecycle.cancelNo')}
              </button>
            </span>
          ) : (
            // Отмена спрашивает подтверждение: обратного перехода у неё нет,
            // а стоит она рядом с кнопкой, которую нажимают каждый раз.
            <button
              type="button"
              onClick={() => {
                setConfirmingCancel(true);
              }}
              className="text-sm text-red-700 underline"
            >
              {t('lifecycle.cancel')}
            </button>
          ))}
      </div>

      {run.error !== null && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {t(errorMessageKey(run.error))}
        </p>
      )}

      {collisions !== null && collisions.length > 0 && (
        <div className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="font-medium text-amber-900">{t('draw.collisions')}</p>
          <p className="mt-1 text-amber-800">{t('draw.collisions.why')}</p>
          {/* Список назван: у страницы много списков, и без имени этот
              неотличим для чтеца экрана. */}
          <ul aria-label={t('draw.collisions')} className="mt-2 text-amber-900">
            {collisions.map((collision) => (
              <li key={`${collision.club}-${collision.group}`}>
                {collision.group}:{' '}
                {collision.participants
                  .map((id) => names.get(id) ?? t('results.match.unknownPlayer'))
                  .join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
