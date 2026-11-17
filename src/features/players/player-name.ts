import type { PlayerView } from '@kttf/shared/types';

import type { MessageKey } from '@/common/i18n';

type Translate = (key: MessageKey) => string;

/**
 * Как игрок подписывается в списках и таблицах.
 *
 * Отчество не показывается: оно не обязательно (бриф, запрет №6), и колонка,
 * заполненная у половины игроков, читается хуже, чем её отсутствие.
 *
 * Удалённый аккаунт (ADR-092) — «Удалённый игрок» на языке интерфейса: имя
 * в базе стёрто, осталась только спортивная история.
 */
export function playerName(
  player: Pick<PlayerView, 'lastName' | 'firstName'> & { readonly deleted?: boolean },
  t: Translate,
): string {
  return personName(`${player.lastName} ${player.firstName}`, player.deleted === true, t);
}

/**
 * Имя, которое сервер прислал строкой (дуэли, лидеры, уведомления). Пустое —
 * аккаунт удалён (ADR-092): сервер стирает имя, а не подставляет подпись.
 */
export function personName(name: string, deleted: boolean, t: Translate): string {
  return deleted || name.trim() === '' ? t('player.deleted') : name;
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
