import type {
  AssignTableInput,
  ListTournamentsQuery,
  MatchResultInput,
  MatchUpdateResult,
  MatchView,
  Page,
  TieDecisionInput,
  TieDecisionResult,
  TournamentResultsView,
  TournamentView,
} from '@kttf/shared/types';

import { apiRequest, queryString } from '@/common/api';

/**
 * Запросы консоли — ТС 7.5 и 7.6.
 *
 * Свой модуль, а не переиспользование публичной части: из консоли нельзя
 * импортировать фичи публичного сайта, иначе их зависимости уезжают в чанки
 * консоли и считаются против бюджета 400 КБ (ADR-004, ТС 8.1).
 *
 * Состояние турнира берётся из `GET /tournaments/:id/results`. Своего снимка
 * у консоли пока нет — он появится вместе с офлайном (спринт 4, ТС 6), и
 * тогда сюда придёт один вызов вместо этого. Лишнее в ответе — журнал
 * рейтинга; на онлайн-режиме это терпимо.
 */

export function fetchConsoleState(tournamentId: string): Promise<TournamentResultsView> {
  return apiRequest<TournamentResultsView>(`/tournaments/${tournamentId}/results`);
}

export function listTournaments(query: ListTournamentsQuery): Promise<Page<TournamentView>> {
  return apiRequest<Page<TournamentView>>(`/tournaments${queryString(query)}`);
}

export function assignTable(matchId: string, input: AssignTableInput): Promise<MatchView> {
  return apiRequest<MatchView>(`/matches/${matchId}/assign`, { method: 'POST', body: input });
}

export function submitResult(matchId: string, input: MatchResultInput): Promise<MatchUpdateResult> {
  return apiRequest<MatchUpdateResult>(`/matches/${matchId}/result`, {
    method: 'POST',
    body: input,
  });
}

/** Правка уже введённого результата — ТЗ 6.3. Фиксируется в журнале сервером. */
export function correctResult(
  matchId: string,
  input: MatchResultInput,
): Promise<MatchUpdateResult> {
  return apiRequest<MatchUpdateResult>(`/matches/${matchId}`, { method: 'PATCH', body: input });
}

/** Возврат встречи в очередь — ТЗ 6.3. */
export function cancelMatch(matchId: string): Promise<MatchUpdateResult> {
  return apiRequest<MatchUpdateResult>(`/matches/${matchId}/cancel`, { method: 'POST' });
}

/** Решение судьи по равенству в таблице — ТЗ 6.6, ADR-008. */
export function decideTie(
  tournamentId: string,
  input: TieDecisionInput,
): Promise<TieDecisionResult> {
  return apiRequest<TieDecisionResult>(`/tournaments/${tournamentId}/tie-decisions`, {
    method: 'POST',
    body: input,
  });
}

/** Завершение турнира с начислением рейтинга — ТЗ 4.1, ADR-022. */
export function finishTournament(tournamentId: string): Promise<TournamentView> {
  return apiRequest<TournamentView>(`/tournaments/${tournamentId}/finish`, { method: 'POST' });
}
