import type { FeedPage, FeedQuery } from '@kttf/shared/types';

import { apiRequest, queryString } from '@/common/api';

/** Лента главной — ADR-073. Токен необязателен: гость видит «Все». */
export function fetchFeed(query: Partial<FeedQuery>): Promise<FeedPage> {
  return apiRequest<FeedPage>(`/feed${queryString(query)}`);
}
