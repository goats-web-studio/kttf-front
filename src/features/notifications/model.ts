import type { NotificationView } from '@kttf/shared/types';

import { fill, type MessageKey } from '@/common/i18n';
import { MY_REQUESTS_HREF, inboxHref } from '@/features/trial-requests/inbox';

type T = (key: MessageKey) => string;

/**
 * Строка уведомления: что случилось, по данным снимка на момент события
 * (заявку могут удалить, клуб — переименовать).
 */
export function notificationText(notification: NotificationView, t: T): string {
  switch (notification.type) {
    case 'TRIAL_REQUEST_NEW':
    case 'TRIAL_REQUEST_CANCELLED':
      return fill(t(`notifications.${notification.type}`), {
        training: notification.data.trainingTitle,
        requester: notification.data.requesterName,
      });
    case 'TRIAL_REQUEST_ANSWERED':
      return fill(
        t(
          notification.data.status === 'ACCEPTED'
            ? 'notifications.TRIAL_REQUEST_ACCEPTED'
            : 'notifications.TRIAL_REQUEST_DECLINED',
        ),
        { target: notification.data.targetName, training: notification.data.trainingTitle },
      );
  }
}

/**
 * Подпись под строкой — чья это заявка, если у человека несколько
 * кабинетов: своя страница тренера или клуб по названию.
 */
export function notificationCaption(notification: NotificationView, t: T): string | null {
  if (notification.type === 'TRIAL_REQUEST_ANSWERED') return null;

  const { inbox } = notification.data;

  return inbox.kind === 'CLUB' ? inbox.name : t('notifications.inboxCoach');
}

/**
 * Куда ведёт строка: новая и отозванная заявка — во вкладку «Заявки»
 * кабинета адресата, ответ — в «Мои заявки» отправителя.
 */
export function notificationHref(notification: NotificationView): string {
  switch (notification.type) {
    case 'TRIAL_REQUEST_NEW':
    case 'TRIAL_REQUEST_CANCELLED':
      return inboxHref(notification.data.inbox);
    case 'TRIAL_REQUEST_ANSWERED':
      return MY_REQUESTS_HREF;
  }
}
