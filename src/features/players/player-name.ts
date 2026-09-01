import type { PlayerView } from '@kttf/shared/types';

/**
 * Как игрок подписывается в списках и таблицах.
 *
 * Отчество не показывается: оно не обязательно (бриф, запрет №6), и колонка,
 * заполненная у половины игроков, читается хуже, чем её отсутствие.
 */
export function playerName(player: PlayerView): string {
  return `${player.lastName} ${player.firstName}`;
}

/**
 * Указатель «игрок по идентификатору».
 *
 * Таблицы, сетки и встречи ссылаются на игрока идентификатором, а состав
 * приходит один раз в `participants`. Без этой карты каждый компонент искал
 * бы игрока перебором по всему списку на каждой строке.
 */
export function playersById(players: readonly PlayerView[]): ReadonlyMap<string, PlayerView> {
  return new Map(players.map((player) => [player.id, player]));
}
