import type { ClubEventKind, TrafficSource } from '@kttf/shared/types';

import { sendClubEvent } from './api';

/**
 * Учёт обращений к клубу — ADR-055, решение 4.
 *
 * Источник — первый заход в сессии: человек пришёл по рекламной ссылке
 * с метками `utm_*`, походил по сайту и открыл клуб — это всё ещё приход
 * с рекламы. Хранится в `sessionStorage`, а не в cookie: сессия кончается
 * с вкладкой, и ничего о человеке не остаётся.
 */

const SOURCE_KEY = 'kttf.trafficSource';
const VIEWED_KEY = 'kttf.viewedClubs';

/** Хранилище сессии или `null`, если браузер его не даёт (приватный режим Safari старых версий). */
function session(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Запоминает источник при первом заходе. Вызывается один раз при старте
 * приложения: метки есть только в адресе первой страницы.
 */
export function rememberTrafficSource(search: string, storage: Storage | null = session()): void {
  if (storage === null) return;
  if (storage.getItem(SOURCE_KEY) !== null) return;

  const params = new URLSearchParams(search);
  const fromCampaign = [...params.keys()].some((key) => key.startsWith('utm_'));

  storage.setItem(SOURCE_KEY, fromCampaign ? 'CAMPAIGN' : 'ORGANIC');
}

export function trafficSource(storage: Storage | null = session()): TrafficSource {
  return storage?.getItem(SOURCE_KEY) === 'CAMPAIGN' ? 'CAMPAIGN' : 'ORGANIC';
}

/**
 * Просмотр страницы — один раз за сессию на клуб. Сервер тоже отсекает
 * повторы, но лишний запрос на каждое возвращение «Назад» ни к чему.
 */
export function trackClubView(clubId: string, storage: Storage | null = session()): void {
  const viewed = new Set((storage?.getItem(VIEWED_KEY) ?? '').split(',').filter(Boolean));

  if (viewed.has(clubId)) return;

  viewed.add(clubId);
  storage?.setItem(VIEWED_KEY, [...viewed].join(','));
  sendClubEvent(clubId, 'VIEW', trafficSource(storage));
}

/** Нажатие на способ связи. Каждое — повторы за полчаса отсекает сервер. */
export function trackClubContact(
  clubId: string,
  kind: Exclude<ClubEventKind, 'VIEW'>,
  storage: Storage | null = session(),
): void {
  sendClubEvent(clubId, kind, trafficSource(storage));
}
