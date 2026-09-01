import type { ListPlayersQuery } from '@kttf/shared/types';
import { queryOptions } from '@tanstack/react-query';

import { fetchPlayer, listPlayers } from './api';

/**
 * Ключи кэша игроков.
 *
 * Фильтры входят в ключ целиком: без них смена города показала бы список
 * предыдущего, пока не придёт ответ.
 */
export const playerKeys = {
  all: ['players'] as const,
  list: (query: ListPlayersQuery) => ['players', 'list', query] as const,
  detail: (id: string) => ['players', 'detail', id] as const,
};

export function playersQuery(query: ListPlayersQuery) {
  return queryOptions({
    queryKey: playerKeys.list(query),
    queryFn: () => listPlayers(query),
  });
}

export function playerQuery(id: string) {
  return queryOptions({
    queryKey: playerKeys.detail(id),
    queryFn: () => fetchPlayer(id),
  });
}
