import type {
  ListTournamentsQuery,
  Page,
  SyncRequest,
  SyncResult,
  TournamentSnapshotView,
  TournamentView,
} from '@kttf/shared/types';

import { apiRequest, queryString } from '@/common/api';

/**
 * Запросы консоли — ТС 6.
 *
 * Их ровно три, и это следствие офлайн-режима: снимок турнира, отправка
 * очереди, завершение турнира. Отдельных маршрутов на ввод счёта, назначение
 * стола и отмену здесь больше нет — всё это уходит очередью, одинаково
 * в зале с сетью и без неё (ТЗ 6.4).
 *
 * Свой модуль, а не переиспользование публичной части: из консоли нельзя
 * импортировать фичи публичного сайта, иначе их зависимости уезжают в чанки
 * консоли и считаются против бюджета 400 КБ (ADR-004, ТС 8.1).
 */

export function fetchSnapshot(tournamentId: string): Promise<TournamentSnapshotView> {
  return apiRequest<TournamentSnapshotView>(`/tournaments/${tournamentId}/snapshot`);
}

export function sendOperations(tournamentId: string, request: SyncRequest): Promise<SyncResult> {
  return apiRequest<SyncResult>(`/tournaments/${tournamentId}/sync`, {
    method: 'POST',
    body: request,
  });
}

export function listTournaments(query: ListTournamentsQuery): Promise<Page<TournamentView>> {
  return apiRequest<Page<TournamentView>>(`/tournaments${queryString(query)}`);
}

/**
 * Завершение турнира с начислением рейтинга — ТЗ 4.1, ADR-022.
 *
 * Единственное действие консоли, которому нужна сеть: рейтинг считает сервер,
 * и в очередь операций завершение не кладётся (ТС 6.2). Судья закрывает
 * турнир после того, как очередь ушла.
 */
export function finishTournament(tournamentId: string): Promise<TournamentView> {
  return apiRequest<TournamentView>(`/tournaments/${tournamentId}/finish`, { method: 'POST' });
}
