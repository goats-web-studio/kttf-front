import type {
  RegistrationCoach,
  SetRegistrationCoachInput,
  TournamentStatus,
} from '@kttf/shared/types';

import {
  coachFields,
  initialCoachOption,
  type CoachOption,
} from '@/features/players/coach-options';

/**
 * Тренер участника на турнире — ADR-059, T3. Чистые функции: когда его
 * можно править и как поле анкеты превращается в тело запроса.
 */

/** До старта: после него запись — история, по ней считаются медали учеников. */
const EDITABLE: ReadonlySet<TournamentStatus> = new Set<TournamentStatus>([
  'DRAFT',
  'PUBLISHED',
  'REG_OPEN',
  'REG_CLOSED',
]);

export function isCoachEditable(status: TournamentStatus): boolean {
  return EDITABLE.has(status);
}

/** Вариант поля по тренеру записи: из списка — по игроку, вписанный — строкой. */
export function coachOptionOf(coach: RegistrationCoach | null): CoachOption | null {
  return coach === null ? null : initialCoachOption(coach.playerId ?? undefined, coach.name);
}

/** Тело `PUT …/coach`: одно из двух полей, пустое поле — оба `null`. */
export function coachInputOf(option: CoachOption | null): SetRegistrationCoachInput {
  const fields = coachFields(option);

  return { coachPlayerId: fields.coachPlayerId ?? null, coachName: fields.coachName ?? null };
}
