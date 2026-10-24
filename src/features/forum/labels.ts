import {
  FORUM_IMAGE_PATH_PATTERN,
  FORUM_POSTS_PAGE_SIZE,
  forumPostPage,
  type ForumPostRole,
  type ForumReportReason,
  type ForumRule,
  type ForumSubject,
  type ForumSubjectType,
} from '@kttf/shared/types';

import type { MessageKey } from '@/common/i18n';
import { productHref } from '@/features/market/labels';

/** Адреса форума — ADR-064, `docs/12` 5. */
export const FORUM_HREF = '/forum';

export const sectionHref = (slug: string): string => `/forum/${slug}`;

export const newTopicHref = (sectionSlug?: string): string =>
  sectionSlug === undefined ? '/forum/new' : `/forum/new?section=${sectionSlug}`;

/** Тема, при номере — страница с ним и якорь на сообщение. */
export function topicHref(topicId: string, number?: number): string {
  const base = `/forum/topics/${topicId}`;

  if (number === undefined) return base;

  // Первое сообщение — «статья» над ответами, у неё нет страницы.
  if (number === 1) return `${base}#post-1`;

  // Страница по номеру — у ответов по порядку; в обсуждении турнира по
  // умолчанию новые сверху, поэтому порядок в ссылке назван явно (ADR-067).
  const page = forumPostPage(number, FORUM_POSTS_PAGE_SIZE);

  return `${base}?sort=OLD${page > 1 ? `&page=${String(page)}` : ''}#post-${String(number)}`;
}

/** Последняя страница ответов (по порядку) — туда ведёт «к последнему ответу». */
export const lastPage = (postsCount: number): number =>
  Math.max(1, Math.ceil((postsCount - 1) / FORUM_POSTS_PAGE_SIZE));

export const FEED_HREF = '/forum/feed';
export const RULES_HREF = '/forum/rules';

/** Лента сообщений игрока — «все сообщения» из профиля. */
export const playerFeedHref = (playerId: string): string => `/forum/feed?author=${playerId}`;

/** Страница предмета темы: турнир, клуб, тренер, товар. */
export function subjectHref(subject: ForumSubject): string {
  switch (subject.type) {
    case 'TOURNAMENT':
      return `/tournaments/${subject.id}`;
    case 'CLUB':
      return `/clubs/${subject.id}`;
    case 'COACH':
      return `/coaches/${subject.slug ?? subject.id}`;
    case 'PRODUCT':
      return productHref(subject.slug ?? subject.id);
    case 'CLUB_POST':
    case 'COACH_POST':
      return subject.owner === null ? FORUM_HREF : ownerHref(subject.owner);
  }
}

/** Страница клуба или тренера — владельца новости. */
export function ownerHref(owner: NonNullable<ForumSubject['owner']>): string {
  return owner.kind === 'CLUB' ? `/clubs/${owner.id}` : `/coaches/${owner.slug ?? owner.id}`;
}

/** Тема — новость клуба или тренера (ADR-067): у неё свой вид статьи. */
export const isNews = (subject: ForumSubject | null): boolean =>
  subject?.type === 'CLUB_POST' || subject?.type === 'COACH_POST';

export const SUBJECT_KEYS: Readonly<Record<ForumSubjectType, MessageKey>> = {
  TOURNAMENT: 'forum.subject.TOURNAMENT',
  CLUB: 'forum.subject.CLUB',
  COACH: 'forum.subject.COACH',
  PRODUCT: 'forum.subject.PRODUCT',
  CLUB_POST: 'forum.subject.CLUB_POST',
  COACH_POST: 'forum.subject.COACH_POST',
};

/** Метка того, кто говорит за обсуждаемую сторону (ADR-067 §3). */
export const ROLE_KEYS: Readonly<Record<ForumPostRole, MessageKey>> = {
  ORGANIZER: 'forum.role.ORGANIZER',
  CLUB: 'forum.role.CLUB',
  COACH: 'forum.role.COACH',
};

/** Пункты «Правил общения» — `/forum/rules` (ADR-067 §8). */
export const RULE_KEYS: Readonly<Record<ForumRule, MessageKey>> = {
  ABUSE: 'forum.rule.ABUSE',
  FLOOD: 'forum.rule.FLOOD',
  ADS: 'forum.rule.ADS',
  DUPLICATE: 'forum.rule.DUPLICATE',
  OFFTOPIC: 'forum.rule.OFFTOPIC',
  OTHER: 'forum.rule.OTHER',
};

export const REPORT_REASON_KEYS: Readonly<Record<ForumReportReason, MessageKey>> = {
  SPAM: 'forum.report.SPAM',
  ABUSE: 'forum.report.ABUSE',
  OFFTOPIC: 'forum.report.OFFTOPIC',
  OTHER: 'forum.report.OTHER',
};

/** «Иванов Иван» → фамилия и имя для инициалов аватара. */
export function splitName(name: string): { lastName: string; firstName: string } {
  const [lastName = '', firstName = ''] = name.split(' ');

  return { lastName, firstName };
}

/** Вариант фото форума нужной ширины — сервер кладёт их рядом с основным. */
export function forumImageVariant(url: string, width: 480 | 960): string {
  return FORUM_IMAGE_PATH_PATTERN.test(url)
    ? url.replace(/\.webp$/, `-${String(width)}.webp`)
    : url;
}
