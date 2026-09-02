import type { ScreenView } from '@kttf/shared/types';

import { API_BASE_URL, apiRequest } from '@/common/api';

/**
 * Запросы экрана зала — ТС 7.7.
 *
 * Оба маршрута открыты по публичному токену: сессии у телевизора на стене
 * нет и не будет, поэтому запрос помечен `anonymous` — иначе отказ запустил
 * бы обновление токенов, которых не существует.
 */

export function fetchScreen(publicToken: string): Promise<ScreenView> {
  return apiRequest<ScreenView>(`/public/screen/${publicToken}`, { anonymous: true });
}

/** Адрес потока состояния. `EventSource` открывает его сам и сам переподключается. */
export function screenStreamUrl(publicToken: string): string {
  return `${API_BASE_URL}/public/screen/${publicToken}/stream`;
}
