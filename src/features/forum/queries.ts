import type {
  ForumSubjectType,
  ListForumPlayerPostsQuery,
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
  listForumPlayerPosts,
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
  posts: (topicId: string, page: number) => ['forum', 'topic', topicId, 'posts', page] as const,
  playerPosts: (query: ListForumPlayerPostsQuery) => ['forum', 'player-posts', query] as const,
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

export function forumPostsQuery(topicId: string, page: number) {
  return queryOptions({
    queryKey: forumKeys.posts(topicId, page),
    queryFn: () => listForumPosts(topicId, { page }),
  });
}

export function forumPlayerPostsQuery(query: ListForumPlayerPostsQuery) {
  return queryOptions({
    queryKey: forumKeys.playerPosts(query),
    queryFn: () => listForumPlayerPosts(query),
  });
}

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
