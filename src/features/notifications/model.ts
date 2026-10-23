import type { NotificationView } from '@kttf/shared/types';

import { fill, type MessageKey } from '@/common/i18n';
import { topicHref } from '@/features/forum/labels';
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
    case 'FORUM_REPLY':
      return fill(t('notifications.FORUM_REPLY'), {
        author: notification.data.authorName,
        topic: notification.data.topicTitle,
      });
    case 'FORUM_TOPIC_UPDATE':
      return fill(
        t(
          notification.data.count > 1
            ? 'notifications.FORUM_TOPIC_UPDATE_MANY'
            : 'notifications.FORUM_TOPIC_UPDATE',
        ),
        {
          author: notification.data.authorName,
          topic: notification.data.topicTitle,
          count: String(notification.data.count),
        },
      );
    case 'FORUM_POST_HIDDEN':
      return fill(
        t(
          notification.data.postId === null
            ? 'notifications.FORUM_TOPIC_HIDDEN'
            : 'notifications.FORUM_POST_HIDDEN',
        ),
        { topic: notification.data.topicTitle, reason: notification.data.reason },
      );
  }
}

/**
 * Подпись под строкой — чья это заявка, если у человека несколько
 * кабинетов: своя страница тренера или клуб по названию. У форума — «Форум».
 */
export function notificationCaption(notification: NotificationView, t: T): string | null {
  switch (notification.type) {
    case 'TRIAL_REQUEST_ANSWERED':
      return null;
    case 'FORUM_REPLY':
    case 'FORUM_TOPIC_UPDATE':
    case 'FORUM_POST_HIDDEN':
      return t('notifications.forum');
    case 'TRIAL_REQUEST_NEW':
    case 'TRIAL_REQUEST_CANCELLED':
      break;
  }

  const { inbox } = notification.data;

  return inbox.kind === 'CLUB' ? inbox.name : t('notifications.inboxCoach');
}

/**
 * Куда ведёт строка: новая и отозванная заявка — во вкладку «Заявки»
 * кабинета адресата, ответ — в «Мои заявки» отправителя. Форум — к
 * сообщению в теме: первому непрочитанному, процитированному, скрытому.
 */
export function notificationHref(notification: NotificationView): string {
  switch (notification.type) {
    case 'TRIAL_REQUEST_NEW':
    case 'TRIAL_REQUEST_CANCELLED':
      return inboxHref(notification.data.inbox);
    case 'TRIAL_REQUEST_ANSWERED':
      return MY_REQUESTS_HREF;
    case 'FORUM_REPLY':
    case 'FORUM_TOPIC_UPDATE':
      return topicHref(notification.data.topicId, notification.data.number);
    case 'FORUM_POST_HIDDEN':
      return notification.data.number === null
        ? topicHref(notification.data.topicId)
        : topicHref(notification.data.topicId, notification.data.number);
  }
}
