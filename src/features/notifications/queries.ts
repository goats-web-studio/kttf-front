import { NOTIFICATIONS_POLL_MS, type PageQuery } from '@kttf/shared/types';
import { queryOptions } from '@tanstack/react-query';

import { fetchUnreadNotifications, listNotifications } from './api';

/** Ключи — под одним корнем: прочтение меняет и список, и число на колокольчике. */
export const notificationKeys = {
  all: ['notifications'] as const,
  list: (query: PageQuery) => ['notifications', 'list', query] as const,
  unread: ['notifications', 'unread'] as const,
};

export function notificationsQuery(query: PageQuery) {
  return queryOptions({
    queryKey: notificationKeys.list(query),
    queryFn: () => listNotifications(query),
  });
}

/**
 * Число непрочитанных — опрос раз в `NOTIFICATIONS_POLL_MS` и при
 * возврате на вкладку (`docs/11` 3.3.3). Фоновая вкладка не опрашивает.
 */
export const unreadNotificationsQuery = queryOptions({
  queryKey: notificationKeys.unread,
  queryFn: fetchUnreadNotifications,
  refetchInterval: NOTIFICATIONS_POLL_MS,
  refetchOnWindowFocus: 'always',
});
