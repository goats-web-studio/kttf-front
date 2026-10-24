import type {
  ForumSubjectType,
  ForumPostSort,
  ListForumFeedQuery,
  ListForumReportsQuery,
  ListForumTopicsQuery,
  PageQuery,
} from '@kttf/shared/types';
import { queryOptions } from '@tanstack/react-query';

import {
  fetchForumMe,
  fetchForumSubject,
  fetchForumTopic,
  listAdminForumSections,
  listForumMutes,
  fetchForumOnline,
  listForumBirthdays,
  listForumFeed,
  listForumPosts,
  listForumReports,
  listForumSections,
  listForumTopics,
} from './api';

/**
 * Ключи — под одним корнем `forum`: ответ в теме меняет и её страницу, и
 * список раздела, и счётчики разделов, и блок на странице предмета.
 */
export const forumKeys = {
  all: ['forum'] as const,
  sections: ['forum', 'sections'] as const,
  me: ['forum', 'me'] as const,
  topics: (query: Partial<ListForumTopicsQuery>) => ['forum', 'topics', query] as const,
  topic: (topicId: string) => ['forum', 'topic', topicId] as const,
  posts: (topicId: string, page: number, sort: ForumPostSort) =>
    ['forum', 'topic', topicId, 'posts', sort, page] as const,
  feed: (query: Partial<ListForumFeedQuery>) => ['forum', 'feed', query] as const,
  online: ['forum', 'online'] as const,
  birthdays: ['forum', 'birthdays'] as const,
  subject: (type: ForumSubjectType, id: string) => ['forum', 'subject', type, id] as const,
  reports: (query: Partial<ListForumReportsQuery>) => ['forum', 'admin', 'reports', query] as const,
  mutes: (query: PageQuery) => ['forum', 'admin', 'mutes', query] as const,
  adminSections: ['forum', 'admin', 'sections'] as const,
};

export const forumSectionsQuery = queryOptions({
  queryKey: forumKeys.sections,
  queryFn: listForumSections,
  staleTime: 60_000,
});

/** Может ли вошедший писать. Спрашивается только под входом. */
export const forumMeQuery = queryOptions({
  queryKey: forumKeys.me,
  queryFn: fetchForumMe,
  staleTime: 60_000,
});

export function forumTopicsQuery(query: Partial<ListForumTopicsQuery>) {
  return queryOptions({
    queryKey: forumKeys.topics(query),
    queryFn: () => listForumTopics(query),
  });
}

export function forumTopicQuery(topicId: string) {
  return queryOptions({
    queryKey: forumKeys.topic(topicId),
    queryFn: () => fetchForumTopic(topicId),
  });
}

/** Ответы темы — без первого сообщения: оно «статья» над ними (ADR-067). */
export function forumPostsQuery(topicId: string, page: number, sort: ForumPostSort) {
  return queryOptions({
    queryKey: forumKeys.posts(topicId, page, sort),
    queryFn: () => listForumPosts(topicId, { page, sort, replies: true }),
  });
}

export function forumFeedQuery(query: Partial<ListForumFeedQuery>) {
  return queryOptions({
    queryKey: forumKeys.feed(query),
    queryFn: () => listForumFeed(query),
  });
}

/** «Сейчас на сайте» — раз в минуту, как колокольчик. */
export const forumOnlineQuery = queryOptions({
  queryKey: forumKeys.online,
  queryFn: fetchForumOnline,
  refetchInterval: 60_000,
});

export const forumBirthdaysQuery = queryOptions({
  queryKey: forumKeys.birthdays,
  queryFn: listForumBirthdays,
  staleTime: 10 * 60_000,
});

export function forumSubjectQuery(type: ForumSubjectType, id: string) {
  return queryOptions({
    queryKey: forumKeys.subject(type, id),
    queryFn: () => fetchForumSubject(type, id),
  });
}

export function forumReportsQuery(query: Partial<ListForumReportsQuery>) {
  return queryOptions({
    queryKey: forumKeys.reports(query),
    queryFn: () => listForumReports(query),
  });
}

export function forumMutesQuery(query: PageQuery) {
  return queryOptions({
    queryKey: forumKeys.mutes(query),
    queryFn: () => listForumMutes(query),
  });
}

export const adminForumSectionsQuery = queryOptions({
  queryKey: forumKeys.adminSections,
  queryFn: listAdminForumSections,
});
