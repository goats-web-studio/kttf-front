import type { NotificationView } from '@kttf/shared/types';

import { fill, formatDateTime, formatDelta, type Locale, type MessageKey } from '@/common/i18n';
import { duelHref } from '@/features/duels/labels';
import { RULE_KEYS, RULES_HREF, topicHref } from '@/features/forum/labels';
import { MY_REQUESTS_HREF, inboxHref } from '@/features/trial-requests/inbox';

type T = (key: MessageKey) => string;

/**
 * Строка уведомления: что случилось, по данным снимка на момент события
 * (заявку могут удалить, клуб — переименовать). Язык — для дат в строке:
 * время назначенной игры и срок подтверждения счёта.
 */
export function notificationText(notification: NotificationView, t: T, locale: Locale): string {
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
    case 'FORUM_WARNING':
      return fill(t('notifications.FORUM_WARNING'), {
        rule: t(RULE_KEYS[notification.data.rule]),
      });
    case 'DUEL_CHALLENGE':
      return fill(
        t(
          notification.data.kind === 'DUEL'
            ? 'notifications.DUEL_CHALLENGE'
            : notification.data.rated
              ? 'notifications.DUEL_CHALLENGE_SPARRING_RATED'
              : 'notifications.DUEL_CHALLENGE_SPARRING',
        ),
        { player: notification.data.playerName },
      );
    case 'DUEL_RESPONSE':
    case 'DUEL_DISPUTED':
      return fill(t(`notifications.${notification.type}`), {
        player: notification.data.playerName,
      });
    case 'DUEL_SCHEDULED':
      return fill(t('notifications.DUEL_SCHEDULED'), {
        player: notification.data.playerName,
        when: formatDateTime(notification.data.startsAt, locale),
      });
    case 'DUEL_DECLINED':
      return fill(
        t(
          notification.data.reason === 'TAKEN'
            ? 'notifications.DUEL_DECLINED_TAKEN'
            : 'notifications.DUEL_DECLINED',
        ),
        { player: notification.data.playerName },
      );
    case 'DUEL_CANCELLED':
      return fill(
        t(
          notification.data.reason === null
            ? 'notifications.DUEL_CANCELLED'
            : 'notifications.DUEL_CANCELLED_REASON',
        ),
        { player: notification.data.playerName, reason: notification.data.reason ?? '' },
      );
    case 'DUEL_RESULT':
      return fill(t('notifications.DUEL_RESULT'), {
        player: notification.data.playerName,
        score: `${String(notification.data.setsFor)}:${String(notification.data.setsAgainst)}`,
        until: formatDateTime(notification.data.confirmBy, locale),
      });
    case 'DUEL_COMPLETED':
      return fill(
        t(
          notification.data.delta === null
            ? 'notifications.DUEL_COMPLETED'
            : 'notifications.DUEL_COMPLETED_RATED',
        ),
        {
          player: notification.data.playerName,
          delta: notification.data.delta === null ? '' : formatDelta(notification.data.delta),
        },
      );
  }
}

/**
 * Подпись под строкой — чья это заявка, если у человека несколько
 * кабинетов: своя страница тренера или клуб по названию. У форума — «Форум»,
 * у дуэлей — «Дуэли и спарринги».
 */
export function notificationCaption(notification: NotificationView, t: T): string | null {
  switch (notification.type) {
    case 'TRIAL_REQUEST_ANSWERED':
      return null;
    case 'FORUM_REPLY':
    case 'FORUM_TOPIC_UPDATE':
    case 'FORUM_POST_HIDDEN':
    case 'FORUM_WARNING':
      return t('notifications.forum');
    case 'DUEL_CHALLENGE':
    case 'DUEL_RESPONSE':
    case 'DUEL_SCHEDULED':
    case 'DUEL_DECLINED':
    case 'DUEL_CANCELLED':
    case 'DUEL_RESULT':
    case 'DUEL_COMPLETED':
    case 'DUEL_DISPUTED':
      return t('notifications.duels');
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
    case 'FORUM_WARNING':
      // Предупреждение ведёт к сообщению, а без него — к правилам.
      return notification.data.topicId === null
        ? RULES_HREF
        : topicHref(notification.data.topicId, notification.data.number ?? undefined);
    // Всё о дуэли — на её странице: отклики, счёт, подтверждение.
    case 'DUEL_CHALLENGE':
    case 'DUEL_RESPONSE':
    case 'DUEL_SCHEDULED':
    case 'DUEL_DECLINED':
    case 'DUEL_CANCELLED':
    case 'DUEL_RESULT':
    case 'DUEL_COMPLETED':
    case 'DUEL_DISPUTED':
      return duelHref(notification.data.duelId);
  }
}
