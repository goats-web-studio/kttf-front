import type {
  AdminFeedQuery,
  FeedCurationInput,
  FeedPage,
  FeedQuery,
  PlayerPostsPage,
  PlayerPostsQuery,
} from '@kttf/shared/types';

import { apiRequest, queryString } from '@/common/api';

/** Лента главной — ADR-073. Токен необязателен: гость видит «Все». */
export function fetchFeed(query: Partial<FeedQuery>): Promise<FeedPage> {
  return apiRequest<FeedPage>(`/feed${queryString(query)}`);
}

/** Стена игрока — его записи; `archived` — архив, только свой (ADR-075). */
export function fetchPlayerPosts(
  playerId: string,
  query: Partial<PlayerPostsQuery>,
): Promise<PlayerPostsPage> {
  return apiRequest<PlayerPostsPage>(`/feed/players/${playerId}/posts${queryString(query)}`);
}

/** Убрать запись в архив и вернуть — только автор. */
export async function archiveTopic(topicId: string, archived: boolean): Promise<void> {
  await apiRequest<undefined>(`/forum/topics/${topicId}/archive`, {
    method: 'PUT',
    body: { archived },
  });
}

/** Лента глазами администратора — со скрытыми и закреплёнными. */
export function fetchAdminFeed(query: Partial<AdminFeedQuery>): Promise<FeedPage> {
  return apiRequest<FeedPage>(`/feed/admin${queryString(query)}`);
}

/** Закрепить или скрыть карточку ленты. */
export async function curateFeed(input: FeedCurationInput): Promise<void> {
  await apiRequest<undefined>('/feed/curation', { method: 'POST', body: input });
}
