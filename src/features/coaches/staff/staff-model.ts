import {
  clubCoachAwaits,
  type AuthUserView,
  type ClubCoachStatus,
  type CoachStudentsView,
  type CoachTenureView,
  type CoachView,
  type PlayerProfileView,
} from '@kttf/shared/types';

/**
 * Логика штаба клуба и учеников тренера — T2.1 (ADR-059, `docs/11` 3.2.1).
 * Чистые функции: кнопки и подписи по ним проверяются без вёрстки.
 */

/** Что можно сделать со связью «клуб — тренер» с этой стороны. */
export type StaffAction = 'confirm' | 'decline' | 'revoke' | 'leave';

/**
 * Кнопки связи по статусу и стороне — правило `clubCoachAwaits` из общего
 * кода: ждёт ответа этой стороны — «Принять» и «Отклонить»; ждёт другую —
 * «Отозвать»; в штабе — «Убрать из штаба» (клуб) или «Выйти из штаба»
 * (тренер). Все отказы — один маршрут `DELETE /club-coaches/…`.
 */
export function staffActions(status: ClubCoachStatus, side: 'CLUB' | 'COACH'): StaffAction[] {
  if (status === 'ACTIVE') return ['leave'];
  if (clubCoachAwaits(status, side)) return ['confirm', 'decline'];

  return ['revoke'];
}

/** «Я ученик» на странице тренера: кнопки нет, уже ученик или можно стать. */
export type StudentState = 'hidden' | 'student' | 'can-join';

/**
 * Кнопка — только вошедшему игроку с профилем, который не сам этот тренер
 * (`docs/11` 3.2.1). Ученик ли он — по тренеру в его анкете.
 */
export function studentState(
  user: Pick<AuthUserView, 'playerId'> | null,
  coach: Pick<CoachView, 'player'>,
  own: Pick<PlayerProfileView, 'coachPlayerId'> | undefined,
): StudentState {
  if (user?.playerId == null || user.playerId === coach.player.id || own === undefined) {
    return 'hidden';
  }

  return own.coachPlayerId === coach.player.id ? 'student' : 'can-join';
}

/** Год из даты истории — по UTC+5, как все даты продукта для Казахстана. */
function yearOf(iso: string): number {
  return new Date(new Date(iso).getTime() + 5 * 60 * 60 * 1000).getUTCFullYear();
}

/** «2024» — с какого года текущий тренер. */
export function sinceYear(iso: string): string {
  return String(yearOf(iso));
}

/** «2020–2024» или «2024», если период уложился в год. */
export function tenureYears(tenure: Pick<CoachTenureView, 'from' | 'to'>): string {
  const from = yearOf(tenure.from);
  const to = tenure.to === null ? null : yearOf(tenure.to);

  return to === null || to === from ? String(from) : `${String(from)}–${String(to)}`;
}

/**
 * Есть ли в блоке «Ученики» что показать, кроме кнопки «Я ученик». Турниры
 * считаются по тренеру в записи на турнир (T3): заявиться с тренером мог и
 * тот, у кого в анкете его нет.
 */
export function hasStudents(
  view: Pick<CoachStudentsView, 'current' | 'former' | 'tournaments'>,
): boolean {
  return view.current > 0 || view.former > 0 || view.tournaments.length > 0;
}
