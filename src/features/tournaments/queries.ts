import type { ListTournamentsQuery } from '@kttf/shared/types';
import { queryOptions } from '@tanstack/react-query';

import { fetchTournament, fetchTournamentResults, listTournaments } from './api';

/** Ключи кэша турниров. Фильтры входят в ключ списка целиком. */
export const tournamentKeys = {
  all: ['tournaments'] as const,
  list: (query: ListTournamentsQuery) => ['tournaments', 'list', query] as const,
  detail: (id: string) => ['tournaments', 'detail', id] as const,
  results: (id: string) => ['tournaments', 'results', id] as const,
};

export function tournamentsQuery(query: ListTournamentsQuery) {
  return queryOptions({
    queryKey: tournamentKeys.list(query),
    queryFn: () => listTournaments(query),
  });
}

export function tournamentQuery(id: string) {
  return queryOptions({
    queryKey: tournamentKeys.detail(id),
    queryFn: () => fetchTournament(id),
  });
}

/**
 * Результаты идущего турнира устаревают быстро.
 *
 * Страница результатов открыта у зрителей в зале, пока идут встречи, и
 * получасовой кэш показал бы им счёт получасовой давности. Обновление по
 * возвращении в вкладку здесь уместно, в отличие от умолчания клиента.
 */
export function tournamentResultsQuery(id: string) {
  return queryOptions({
    queryKey: tournamentKeys.results(id),
    queryFn: () => fetchTournamentResults(id),
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });
}
