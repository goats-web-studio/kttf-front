import type { FeedTab } from '@kttf/shared/types';
import { infiniteQueryOptions } from '@tanstack/react-query';

import { fetchFeed, fetchPlayerPosts } from './api';

/** Карточек на порцию: экран-два ленты, дальше — «Показать ещё». */
export const FEED_PAGE = 8;

export const feedKeys = {
  all: ['feed'] as const,
  tab: (tab: FeedTab, signedIn: boolean) => ['feed', tab, signedIn] as const,
};

/**
 * Лента подгрузкой: читается сверху вниз, страницы ей не нужны. Вошёл или
 * нет — в ключе: «Для вас» у гостя и у вошедшего разные.
 */
export function feedQuery(tab: FeedTab, signedIn: boolean) {
  return infiniteQueryOptions({
    queryKey: feedKeys.tab(tab, signedIn),
    queryFn: ({ pageParam }) => fetchFeed({ tab, page: pageParam, limit: FEED_PAGE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.limit < last.total ? last.page + 1 : undefined),
  });
}

/** Записей на стене за порцию. */
export const WALL_PAGE = 10;

export const wallKeys = {
  all: ['wall'] as const,
  of: (playerId: string, archived: boolean) => ['wall', playerId, archived] as const,
};

export function wallQuery(playerId: string, archived: boolean) {
  return infiniteQueryOptions({
    queryKey: wallKeys.of(playerId, archived),
    queryFn: ({ pageParam }) =>
      fetchPlayerPosts(playerId, {
        page: pageParam,
        limit: WALL_PAGE,
        ...(archived ? { archived: true } : {}),
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.limit < last.total ? last.page + 1 : undefined),
  });
}
