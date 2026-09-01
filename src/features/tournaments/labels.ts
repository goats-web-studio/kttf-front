import type {
  MatchStatus,
  PlacementReason,
  RegistrationStatus,
  ResultType,
  StageType,
  TournamentLevel,
  TournamentStatus,
} from '@kttf/shared/types';

import type { MessageKey } from '@/common/i18n';

/**
 * Перечисления контракта — в тексты интерфейса.
 *
 * Тип `Record` обязывает перечислить все значения: новое состояние в общем
 * коде ломает сборку здесь, а не выходит к человеку английской строкой из
 * базы. Тот же приём, что и у кодов ошибок в `common/api/messages.ts`.
 */

export const TOURNAMENT_STATUS_KEYS: Readonly<Record<TournamentStatus, MessageKey>> = {
  DRAFT: 'tournament.status.DRAFT',
  PUBLISHED: 'tournament.status.PUBLISHED',
  REG_OPEN: 'tournament.status.REG_OPEN',
  REG_CLOSED: 'tournament.status.REG_CLOSED',
  RUNNING: 'tournament.status.RUNNING',
  FINISHED: 'tournament.status.FINISHED',
  RATED: 'tournament.status.RATED',
  CANCELLED: 'tournament.status.CANCELLED',
};

export const TOURNAMENT_LEVEL_KEYS: Readonly<Record<TournamentLevel, MessageKey>> = {
  CLUB: 'tournament.level.CLUB',
  REGIONAL: 'tournament.level.REGIONAL',
  NATIONAL: 'tournament.level.NATIONAL',
};

export const REGISTRATION_STATUS_KEYS: Readonly<Record<RegistrationStatus, MessageKey>> = {
  REGISTERED: 'registration.status.REGISTERED',
  WAITLIST: 'registration.status.WAITLIST',
  CONFIRMED: 'registration.status.CONFIRMED',
  PLAYING: 'registration.status.PLAYING',
  WITHDRAWN: 'registration.status.WITHDRAWN',
  NO_SHOW: 'registration.status.NO_SHOW',
};

/**
 * Почему у участника нет места — или откуда оно взялось.
 *
 * `GROUP_EXIT` и `UNDECIDED` оба дают пустое место и означают разное:
 * первый выбыл на групповом этапе и за места не играл, у второго место ещё
 * не определено. Одна пустая клетка на оба случая ничего не объясняет.
 */
export const PLACEMENT_REASON_KEYS: Readonly<Record<PlacementReason, MessageKey>> = {
  TABLE: 'results.reason.TABLE',
  BRACKET: 'results.reason.BRACKET',
  SHARED: 'results.reason.SHARED',
  GROUP_EXIT: 'results.reason.GROUP_EXIT',
  UNDECIDED: 'results.reason.UNDECIDED',
};

export const MATCH_STATUS_KEYS: Readonly<Record<MatchStatus, MessageKey>> = {
  PENDING: 'match.status.PENDING',
  QUEUED: 'match.status.QUEUED',
  PLAYING: 'match.status.PLAYING',
  FINISHED: 'match.status.FINISHED',
  CANCELLED: 'match.status.CANCELLED',
};

export const RESULT_TYPE_KEYS: Readonly<Record<ResultType, MessageKey>> = {
  NORMAL: 'match.resultType.NORMAL',
  WALKOVER: 'match.resultType.WALKOVER',
  RETIRED: 'match.resultType.RETIRED',
};

export const STAGE_TYPE_KEYS: Readonly<Record<StageType, MessageKey>> = {
  GROUPS: 'stage.type.GROUPS',
  KNOCKOUT: 'stage.type.KNOCKOUT',
  ROUND_ROBIN: 'stage.type.ROUND_ROBIN',
  CONSOLATION: 'stage.type.CONSOLATION',
};
