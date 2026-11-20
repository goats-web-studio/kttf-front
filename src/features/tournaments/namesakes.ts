import { ERROR_CODES, isAppError } from '@kttf/shared/errors';

export interface Namesake {
  readonly id: string;
  readonly lastName: string;
  readonly firstName: string;
  readonly birthYear: number;
  readonly rating: number;
  /** Игровой профиль. `false` — анкета без рейтинга: её подтверждают, а не записывают. */
  readonly confirmed: boolean;
}

/**
 * Найденные тёзки из отказа `PLAYER_DUPLICATE` (ADR-100). Детали приходят
 * из JSON — каждое поле проверяется, чужое молча отбрасывается. Без
 * `confirmed` (ответ сервера до этого поля) профиль считается игровым.
 */
export function duplicatesOf(error: unknown): readonly Namesake[] {
  if (!isAppError(error) || error.code !== ERROR_CODES.PLAYER_DUPLICATE) return [];

  const players = error.details?.players;

  if (!Array.isArray(players)) return [];

  return players.flatMap((player: unknown): Namesake[] => {
    if (
      typeof player !== 'object' ||
      player === null ||
      !('id' in player) ||
      typeof player.id !== 'string' ||
      !('lastName' in player) ||
      typeof player.lastName !== 'string' ||
      !('firstName' in player) ||
      typeof player.firstName !== 'string' ||
      !('birthYear' in player) ||
      typeof player.birthYear !== 'number' ||
      !('rating' in player) ||
      typeof player.rating !== 'number'
    ) {
      return [];
    }

    return [
      {
        id: player.id,
        lastName: player.lastName,
        firstName: player.firstName,
        birthYear: player.birthYear,
        rating: player.rating,
        confirmed: !('confirmed' in player) || player.confirmed !== false,
      },
    ];
  });
}
