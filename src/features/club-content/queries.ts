import type { ListClubPostsQuery, PageQuery } from '@kttf/shared/types';
import { queryOptions } from '@tanstack/react-query';

import {
  fetchClubContentFeed,
  listAllClubMedia,
  listAllClubPosts,
  listClubMedia,
  listClubPosts,
} from './api';

export const clubContentKeys = {
  all: ['club-content'] as const,
  posts: (clubId: string, query: ListClubPostsQuery) =>
    ['club-content', 'posts', clubId, query] as const,
  allPosts: (clubId: string, query: PageQuery) =>
    ['club-content', 'posts-all', clubId, query] as const,
  media: (clubId: string) => ['club-content', 'media', clubId] as const,
  allMedia: (clubId: string) => ['club-content', 'media-all', clubId] as const,
  feed: (query: PageQuery) => ['club-content', 'feed', query] as const,
};

export function clubPostsQuery(clubId: string, query: ListClubPostsQuery) {
  return queryOptions({
    queryKey: clubContentKeys.posts(clubId, query),
    queryFn: () => listClubPosts(clubId, query),
  });
}

export function allClubPostsQuery(clubId: string, query: PageQuery) {
  return queryOptions({
    queryKey: clubContentKeys.allPosts(clubId, query),
    queryFn: () => listAllClubPosts(clubId, query),
  });
}

export function clubMediaQuery(clubId: string) {
  return queryOptions({
    queryKey: clubContentKeys.media(clubId),
    queryFn: () => listClubMedia(clubId),
    staleTime: 60_000,
  });
}

export function allClubMediaQuery(clubId: string) {
  return queryOptions({
    queryKey: clubContentKeys.allMedia(clubId),
    queryFn: () => listAllClubMedia(clubId),
  });
}

export function clubContentFeedQuery(query: PageQuery) {
  return queryOptions({
    queryKey: clubContentKeys.feed(query),
    queryFn: () => fetchClubContentFeed(query),
  });
}
