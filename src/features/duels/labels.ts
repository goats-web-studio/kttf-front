import { ERROR_CODES, isAppError } from '@kttf/shared/errors';
import type {
  DuelBestOf,
  DuelFlag,
  DuelItemView,
  DuelKind,
  DuelStatus,
  DuelVenue,
} from '@kttf/shared/types';

import { errorMessageKey } from '@/common/api';
import { fill, formatTime, type Locale, type MessageKey } from '@/common/i18n';

type T = (key: MessageKey) => string;

/** Адреса дуэлей — `docs/13` 5. */
export const DUELS_HREF = '/duels';
export const MY_DUELS_HREF = '/duels/mine';

export const duelHref = (duelId: string): string => `/duels/${duelId}`;

/** Новое предложение; с игроком — вызов ему (кнопка в профиле). */
export const newDuelHref = (opponentId?: string): string =>
  opponentId === undefined ? '/duels/new' : `/duels/new?opponent=${opponentId}`;

export const KIND_KEYS: Readonly<Record<DuelKind, MessageKey>> = {
  DUEL: 'duel.kind.DUEL',
  SPARRING: 'duel.kind.SPARRING',
};

export const STATUS_KEYS: Readonly<Record<DuelStatus, MessageKey>> = {
  OPEN: 'duel.status.OPEN',
  CHALLENGE: 'duel.status.CHALLENGE',
  SCHEDULED: 'duel.status.SCHEDULED',
  REPORTED: 'duel.status.REPORTED',
  DISPUTED: 'duel.status.DISPUTED',
  COMPLETED: 'duel.status.COMPLETED',
  UNCONFIRMED: 'duel.status.UNCONFIRMED',
  DECLINED: 'duel.status.DECLINED',
  CANCELLED: 'duel.status.CANCELLED',
  EXPIRED: 'duel.status.EXPIRED',
};

/** Тон метки состояния: зелёный — сыграно, жёлтый — ждёт чьего-то шага. */
export const STATUS_TONES: Readonly<Record<DuelStatus, 'ink' | 'ok' | 'warn'>> = {
  OPEN: 'ink',
  CHALLENGE: 'warn',
  SCHEDULED: 'ok',
  REPORTED: 'warn',
  DISPUTED: 'warn',
  COMPLETED: 'ok',
  UNCONFIRMED: 'ink',
  DECLINED: 'ink',
  CANCELLED: 'ink',
  EXPIRED: 'ink',
};

export const FLAG_KEYS: Readonly<Record<DuelFlag, MessageKey>> = {
  PAIR_FREQUENT: 'duel.flag.PAIR_FREQUENT',
  ONE_SIDED: 'duel.flag.ONE_SIDED',
  PROVISIONAL: 'duel.flag.PROVISIONAL',
  BIG_GAIN: 'duel.flag.BIG_GAIN',
};

/** Объяснение пометки: администратор видит, почему дуэль подозрительна. */
export const FLAG_HINT_KEYS: Readonly<Record<DuelFlag, MessageKey>> = {
  PAIR_FREQUENT: 'duel.flag.PAIR_FREQUENT.hint',
  ONE_SIDED: 'duel.flag.ONE_SIDED.hint',
  PROVISIONAL: 'duel.flag.PROVISIONAL.hint',
  BIG_GAIN: 'duel.flag.BIG_GAIN.hint',
};

/** «до 3 побед» — так формат называют в зале, а не «из 5 партий». */
export const BEST_OF_KEYS: Readonly<Record<DuelBestOf, MessageKey>> = {
  3: 'duel.bestOf.3',
  5: 'duel.bestOf.5',
  7: 'duel.bestOf.7',
};

/**
 * Вариант времени одной строкой: «сб, 26 октября · 19:00–21:00». День
 * недели нужен: соперника ищут на «в субботу вечером», а не на число.
 */
export function formatSlot(startsAt: string, endsAt: string, locale: Locale): string {
  const day = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  }).format(new Date(startsAt));

  return `${day} · ${formatTime(startsAt, locale)}–${formatTime(endsAt, locale)}`;
}

/** Место строкой: клуб KTTF или свой зал, адрес — если указан. */
export function venueLines(venue: DuelVenue): { name: string; address: string | null } {
  if (venue.club !== null) return { name: venue.club.name, address: venue.club.address };

  return { name: venue.venueName ?? '', address: venue.venueAddress };
}

/** Участник ли смотрящий: автор или соперник. */
export function isParticipant(duel: DuelItemView, playerId: string | null): boolean {
  return playerId !== null && (duel.author.id === playerId || duel.opponent?.id === playerId);
}

/**
 * Что ждёт моего шага — для «Моих дуэлей» в кабинете, требующие действия
 * первыми (`docs/13` 5.5). Сервер этого не отдаёт списком — считается по
 * состоянию строки; кнопки на странице дуэли всё равно ведёт `can`.
 */
export function duelTodo(duel: DuelItemView, playerId: string, now: Date): MessageKey | null {
  const author = duel.author.id === playerId;
  const opponent = duel.opponent?.id === playerId;

  if (duel.status === 'CHALLENGE' && opponent) return 'duel.todo.answer';
  if ((duel.status === 'OPEN' || duel.status === 'CHALLENGE') && author) {
    return (duel.responsesNew ?? 0) > 0 ? 'duel.todo.responses' : null;
  }
  if (duel.status === 'REPORTED' && (author || opponent)) {
    return duel.result !== null && duel.result.reportedById !== playerId
      ? 'duel.todo.confirm'
      : null;
  }
  if (
    duel.status === 'SCHEDULED' &&
    duel.rated &&
    (author || opponent) &&
    duel.startsAt !== null &&
    Date.parse(duel.startsAt) <= now.getTime()
  ) {
    return 'duel.todo.report';
  }

  return null;
}

/**
 * Ждут моего шага — первыми, остальные в порядке сервера (ближайшие
 * первыми). Сортировка устойчивая: внутри групп порядок не меняется.
 */
export function byTodo(
  duels: readonly DuelItemView[],
  playerId: string,
  now: Date,
): readonly DuelItemView[] {
  const weight = (duel: DuelItemView): number => (duelTodo(duel, playerId, now) === null ? 1 : 0);

  return [...duels].sort((left, right) => weight(left) - weight(right));
}

/**
 * Текст отказа API по дуэли. Пределы и частота называют, что именно
 * исчерпано (`details`): «попробуйте позже» без причины человек повторит
 * и упрётся снова. Остальное — общим правилом `errorMessageKey`.
 */
export function duelErrorText(error: unknown, t: T, playerId: string | null = null): string {
  if (!isAppError(error)) return t(errorMessageKey(error));

  const details = error.details ?? {};

  switch (error.code) {
    case ERROR_CODES.DUEL_LIMIT: {
      const limit = typeof details.limit === 'number' ? String(details.limit) : null;
      const key: MessageKey | null =
        details.kind === 'OPEN'
          ? 'duel.error.limit.OPEN'
          : details.kind === 'CHALLENGES'
            ? 'duel.error.limit.CHALLENGES'
            : details.kind === 'RESPONSES'
              ? 'duel.error.limit.RESPONSES'
              : null;

      return key === null || limit === null ? t(errorMessageKey(error)) : fill(t(key), { limit });
    }
    case ERROR_CODES.DUEL_RATING_LIMIT:
      if (details.kind === 'PAIR') return t('duel.error.rating.PAIR');
      if (details.kind === 'PLAYER') {
        return t(
          details.playerId === playerId
            ? 'duel.error.rating.PLAYER_SELF'
            : 'duel.error.rating.PLAYER',
        );
      }
      return t(errorMessageKey(error));
    case ERROR_CODES.DUEL_OPPONENT_INVALID:
      if (details.reason === 'SELF') return t('duel.error.opponent.SELF');
      if (details.reason === 'NO_ACCOUNT') return t('duel.error.opponent.NO_ACCOUNT');
      return t(errorMessageKey(error));
    case ERROR_CODES.DUEL_SCORE_INVALID:
      return typeof details.setsToWin === 'number'
        ? fill(t('duel.error.score'), { sets: String(details.setsToWin) })
        : t(errorMessageKey(error));
    default:
      return t(errorMessageKey(error));
  }
}
