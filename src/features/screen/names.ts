import type { PlayerView } from '@kttf/shared/types';

/**
 * Разворачивание идентификаторов в фамилии — ТЗ 6.5.
 *
 * Ответ экрана даёт состав отдельным списком, а встречи и таблицы ссылаются
 * на игроков по идентификатору. Карты строятся один раз на состояние, а не
 * поиском по списку в каждой строке таблицы.
 */

export function namesOf(players: readonly PlayerView[]): ReadonlyMap<string, string> {
  return new Map(players.map((player) => [player.id, `${player.lastName} ${player.firstName}`]));
}

/** Рейтинг рядом с фамилией — ТЗ 6.6 требует его и в таблице на стене. */
export function ratingsOf(players: readonly PlayerView[]): ReadonlyMap<string, string> {
  return new Map(players.map((player) => [player.id, player.rating]));
}
