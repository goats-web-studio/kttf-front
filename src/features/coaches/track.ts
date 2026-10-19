import type { CoachEventKind } from '@kttf/shared/types';

import { trafficSource } from '@/features/clubs/track';

import { sendCoachEvent } from './api';

/**
 * Учёт обращений к тренеру — механика клуба (ADR-055, решение 4; ADR-059).
 *
 * Источник — тот же, что у клуба: первый заход в сессии, по меткам `utm_*`.
 * Просмотры — свой список в `sessionStorage`, отдельно от клубов: одна и та
 * же строка идентификаторов на два вида страниц смешала бы счёт.
 */

const VIEWED_KEY = 'kttf.viewedCoaches';

function session(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Просмотр страницы — один раз за сессию на тренера. */
export function trackCoachView(coachId: string, storage: Storage | null = session()): void {
  const viewed = new Set((storage?.getItem(VIEWED_KEY) ?? '').split(',').filter(Boolean));

  if (viewed.has(coachId)) return;

  viewed.add(coachId);
  storage?.setItem(VIEWED_KEY, [...viewed].join(','));
  sendCoachEvent(coachId, 'VIEW', trafficSource(storage));
}

/** Нажатие на способ связи. Повторы за полчаса отсекает сервер. */
export function trackCoachContact(
  coachId: string,
  kind: Exclude<CoachEventKind, 'VIEW'>,
  storage: Storage | null = session(),
): void {
  sendCoachEvent(coachId, kind, trafficSource(storage));
}
