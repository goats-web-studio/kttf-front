import {
  notificationViewSchema,
  type NotificationsUnread,
  type NotificationView,
  type Page,
  type PageQuery,
  type ReadNotificationsInput,
} from '@kttf/shared/types';

import { apiRequest, queryString } from '@/common/api';

/**
 * Уведомления внутри сайта — ТЗ 10, первая часть (ADR-059, T3).
 *
 * Список разбирается схемой построчно: сервер может уже знать тип, которого
 * не знает этот клиент, — такая строка пропускается, а не роняет список.
 */
export async function listNotifications(query: PageQuery): Promise<Page<NotificationView>> {
  const page = await apiRequest<Page<unknown>>(`/notifications${queryString(query)}`);
  const items = page.items.flatMap((item) => {
    const parsed = notificationViewSchema.safeParse(item);

    return parsed.success ? [parsed.data] : [];
  });

  return { ...page, items };
}

export function fetchUnreadNotifications(): Promise<NotificationsUnread> {
  return apiRequest<NotificationsUnread>('/notifications/unread');
}

/** Отметить прочитанными эти; без `ids` — все. */
export async function readNotifications(input: ReadNotificationsInput): Promise<void> {
  await apiRequest<undefined>('/notifications/read', { method: 'POST', body: input });
}
