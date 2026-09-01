import type {
  ListTournamentsQuery,
  Page,
  TournamentResultsView,
  TournamentView,
} from '@kttf/shared/types';

import { apiRequest, queryString } from '@/common/api';

/**
 * Контракт ТС 7.5, один в один.
 *
 * Запросы идут обычным путём, а не `anonymous`: чтение открыто без токена, но
 * токен, если он есть, добавляет организатору видимость его черновиков.
 * `anonymous` здесь отнял бы у вошедшего часть его же турниров.
 */

export function listTournaments(query: ListTournamentsQuery): Promise<Page<TournamentView>> {
  return apiRequest<Page<TournamentView>>(`/tournaments${queryString(query)}`);
}

export function fetchTournament(id: string): Promise<TournamentView> {
  return apiRequest<TournamentView>(`/tournaments/${id}`);
}

/** Публичные результаты — ТЗ 9.4. Открыты без входа. */
export function fetchTournamentResults(id: string): Promise<TournamentResultsView> {
  return apiRequest<TournamentResultsView>(`/tournaments/${id}/results`);
}
