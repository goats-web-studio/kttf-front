import type { ListClubPostsQuery, PageQuery } from '@kttf/shared/types';
import { queryOptions } from '@tanstack/react-query';

import {
  fetchClubContentFeed,
  fetchCoachContentFeed,
  listAllMedia,
  listAllPosts,
  listMedia,
  listPosts,
} from './api';
import type { ContentOwner } from './owner';

/** Ключи — под корнем `content`: любая правка освежает и страницу, и кабинет, и ленту. */
export const contentKeys = {
  all: ['content'] as const,
  posts: (owner: ContentOwner, query: ListClubPostsQuery) =>
    ['content', owner.kind, owner.id, 'posts', query] as const,
  allPosts: (owner: ContentOwner, query: PageQuery) =>
    ['content', owner.kind, owner.id, 'posts-all', query] as const,
  media: (owner: ContentOwner) => ['content', owner.kind, owner.id, 'media'] as const,
  allMedia: (owner: ContentOwner) => ['content', owner.kind, owner.id, 'media-all'] as const,
  feed: (scope: ContentOwner['kind'], query: PageQuery) =>
    ['content', 'feed', scope, query] as const,
};

export function postsQuery(owner: ContentOwner, query: ListClubPostsQuery) {
  return queryOptions({
    queryKey: contentKeys.posts(owner, query),
    queryFn: () => listPosts(owner, query),
  });
}

export function allPostsQuery(owner: ContentOwner, query: PageQuery) {
  return queryOptions({
    queryKey: contentKeys.allPosts(owner, query),
    queryFn: () => listAllPosts(owner, query),
  });
}

export function mediaQuery(owner: ContentOwner) {
  return queryOptions({
    queryKey: contentKeys.media(owner),
    queryFn: () => listMedia(owner),
    staleTime: 60_000,
  });
}

export function allMediaQuery(owner: ContentOwner) {
  return queryOptions({
    queryKey: contentKeys.allMedia(owner),
    queryFn: () => listAllMedia(owner),
  });
}

export function clubContentFeedQuery(query: PageQuery) {
  return queryOptions({
    queryKey: contentKeys.feed('club', query),
    queryFn: () => fetchClubContentFeed(query),
  });
}

export function coachContentFeedQuery(query: PageQuery) {
  return queryOptions({
    queryKey: contentKeys.feed('coach', query),
    queryFn: () => fetchCoachContentFeed(query),
  });
}
