import type { PlayerView } from '@kttf/shared/types';

import { formatRating } from '@/common/i18n';

/**
 * Разворачивание идентификаторов в фамилии — ТЗ 6.5.
 *
 * Ответ экрана даёт состав отдельным списком, а встречи и таблицы ссылаются
 * на игроков по идентификатору. Карты строятся один раз на состояние, а не
 * поиском по списку в каждой строке таблицы.
 */

/** Полное «Фамилия Имя» — для пьедестала и итоговых мест. */
export function namesOf(players: readonly PlayerView[]): ReadonlyMap<string, string> {
  return new Map(players.map((player) => [player.id, `${player.lastName} ${player.firstName}`]));
}

/**
 * «Фамилия И.» — на досках стены (ADR-082): столы, очередь, группы, сетка.
 *
 * Многоточие вместо конца фамилии («Организаторо…») не читается вовсе, а
 * инициал теряет то, что в зале и так не нужно. Однофамильцы с одним
 * инициалом остаются с полным именем: «Ким В.» дважды — уже не подпись.
 */
export function shortNamesOf(players: readonly PlayerView[]): ReadonlyMap<string, string> {
  const initial = (player: PlayerView): string =>
    `${player.lastName} ${player.firstName.slice(0, 1)}.`;
  const count = new Map<string, number>();

  for (const player of players) {
    count.set(initial(player), (count.get(initial(player)) ?? 0) + 1);
  }

  return new Map(
    players.map((player) => [
      player.id,
      (count.get(initial(player)) ?? 0) > 1 || player.firstName === ''
        ? `${player.lastName} ${player.firstName}`.trim()
        : initial(player),
    ]),
  );
}

/** Рейтинг рядом с фамилией — ТЗ 6.6 требует его и в таблице на стене. Целым (ADR-053). */
export function ratingsOf(players: readonly PlayerView[]): ReadonlyMap<string, string> {
  return new Map(players.map((player) => [player.id, formatRating(player.rating)]));
}
