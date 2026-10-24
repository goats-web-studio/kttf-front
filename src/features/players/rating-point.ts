import type { RatingPointView } from '@kttf/shared/types';

import { fill, type MessageKey } from '@/common/i18n';

type T = (key: MessageKey) => string;

/**
 * Подпись точки кривой рейтинга: турнир, дуэль с соперником (ADR-065) или
 * ручная корректировка — у неё нет ни турнира, ни дуэли.
 */
export function ratingPointTitle(
  point: Pick<RatingPointView, 'tournamentName' | 'duel'>,
  t: T,
): string {
  if (point.tournamentName !== null) return point.tournamentName;
  if (point.duel !== null) {
    return fill(t(point.duel.kind === 'DUEL' ? 'player.history.duel' : 'player.history.sparring'), {
      name: point.duel.opponentName,
    });
  }

  return t('player.history.adjustment');
}

/** Куда ведёт точка: на страницу турнира или дуэли; корректировка — никуда. */
export function ratingPointHref(
  point: Pick<RatingPointView, 'tournamentId' | 'duel'>,
): string | null {
  if (point.tournamentId !== null) return `/tournaments/${point.tournamentId}`;
  if (point.duel !== null) return `/duels/${point.duel.id}`;

  return null;
}
