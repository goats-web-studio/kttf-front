import {
  FORUM_IMAGE_PATH_PATTERN,
  FORUM_POSTS_PAGE_SIZE,
  forumPostPage,
  type ForumReportReason,
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
  if (number === undefined) return `/forum/topics/${topicId}`;

  const page = forumPostPage(number, FORUM_POSTS_PAGE_SIZE);

  return `/forum/topics/${topicId}${page > 1 ? `?page=${String(page)}` : ''}#post-${String(number)}`;
}

/** Последняя страница темы — туда ведёт «к последнему ответу». */
export const lastPage = (postsCount: number): number =>
  Math.max(1, Math.ceil(postsCount / FORUM_POSTS_PAGE_SIZE));

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
  }
}

export const SUBJECT_KEYS: Readonly<Record<ForumSubjectType, MessageKey>> = {
  TOURNAMENT: 'forum.subject.TOURNAMENT',
  CLUB: 'forum.subject.CLUB',
  COACH: 'forum.subject.COACH',
  PRODUCT: 'forum.subject.PRODUCT',
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
