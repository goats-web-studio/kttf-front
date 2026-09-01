import { MAX_PAGE_SIZE, type ClubView } from '@kttf/shared/types';
import { queryOptions } from '@tanstack/react-query';

import { fetchClub, listClubs } from './api';

export const clubKeys = {
  all: ['clubs'] as const,
  directory: ['clubs', 'directory'] as const,
  detail: (id: string) => ['clubs', 'detail', id] as const,
};

/**
 * Справочник клубов одним запросом.
 *
 * Турнир несёт только `clubId`, а календарь показывает название клуба и даёт
 * им же фильтровать. Отдельный запрос на каждую карточку — это двадцать
 * запросов на страницу списка; справочник обходится одним и живёт долго:
 * клубы заводятся редко.
 *
 * Потолок страницы — верхняя граница `MAX_PAGE_SIZE`. Когда клубов станет
 * больше сотни, названия придётся отдавать вместе с турниром: разбирать
 * справочник постранично здесь бессмысленно.
 */
export const clubDirectoryQuery = queryOptions({
  queryKey: clubKeys.directory,
  queryFn: () => listClubs({ page: 1, limit: MAX_PAGE_SIZE }),
  staleTime: 5 * 60_000,
  select: (page): ReadonlyMap<string, ClubView> =>
    new Map(page.items.map((club) => [club.id, club])),
});

export function clubQuery(id: string) {
  return queryOptions({
    queryKey: clubKeys.detail(id),
    queryFn: () => fetchClub(id),
    staleTime: 5 * 60_000,
  });
}
