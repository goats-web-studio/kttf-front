import type { FeedFilter, FeedTab } from '@kttf/shared/types';
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { fetchFeed, fetchPlayerPosts } from './api';

/** Карточек на порцию: экран-два ленты, дальше — «Показать ещё». */
export const FEED_PAGE = 8;

export const feedKeys = {
  all: ['feed'] as const,
  tab: (tab: FeedTab, signedIn: boolean, filter: FeedFilter | undefined) =>
    ['feed', tab, signedIn, filter ?? null] as const,
  hot: ['feed', 'hot'] as const,
};

/**
 * Лента подгрузкой: читается сверху вниз, страницы ей не нужны. Вошёл или
 * нет — в ключе: «Для вас» у гостя и у вошедшего разные. `filter` — «Что
 * показывать» страницы «Лента» (ADR-097); без него — всё, как на главной.
 */
export function feedQuery(tab: FeedTab, signedIn: boolean, filter?: FeedFilter) {
  return infiniteQueryOptions({
    queryKey: feedKeys.tab(tab, signedIn, filter),
    queryFn: ({ pageParam }) =>
      fetchFeed({
        tab,
        page: pageParam,
        limit: FEED_PAGE,
        ...(filter === undefined ? {} : { filter }),
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.limit < last.total ? last.page + 1 : undefined),
  });
}

/** Тем в блоке «Обсуждают на форуме» — коротко, рядом с лентой. */
export const FORUM_HOT = 5;

/**
 * «Обсуждают на форуме» — свежие живые темы, та же выдача, что фильтр
 * «Форум» (ADR-097). Вкладка всегда «Все»: блок одинаков у гостя и вошедшего.
 */
export const forumHotQuery = queryOptions({
  queryKey: feedKeys.hot,
  queryFn: () => fetchFeed({ tab: 'ALL', filter: 'FORUM', page: 1, limit: FORUM_HOT }),
});

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
