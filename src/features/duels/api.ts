import type {
  AdminDuelItemView,
  AnnulDuelInput,
  CreateDuelInput,
  DisputeDuelInput,
  DuelItemView,
  DuelReasonInput,
  DuelView,
  ListAdminDuelsQuery,
  ListDuelsQuery,
  ListMyDuelsQuery,
  Page,
  ReportDuelInput,
  RespondDuelInput,
  ResolveDuelInput,
} from '@kttf/shared/types';

import { apiRequest, queryString } from '@/common/api';

/**
 * Дуэли и спарринги — ADR-065, `docs/13` 4. Доска и страница открыты всем;
 * с токеном сервер добавляет то, что видно только смотрящему: отклики,
 * число новых, доступные действия (`can`). Каждое действие отвечает
 * страницей дуэли — её и кладём в кэш.
 */

export function listDuels(query: Partial<ListDuelsQuery>): Promise<Page<DuelItemView>> {
  return apiRequest<Page<DuelItemView>>(`/duels${queryString(query)}`);
}

export function fetchDuel(duelId: string): Promise<DuelView> {
  return apiRequest<DuelView>(`/duels/${duelId}`);
}

export function createDuel(input: CreateDuelInput): Promise<DuelView> {
  return apiRequest<DuelView>('/duels', { method: 'POST', body: input });
}

export function listMyDuels(query: Partial<ListMyDuelsQuery>): Promise<Page<DuelItemView>> {
  return apiRequest<Page<DuelItemView>>(`/me/duels${queryString(query)}`);
}

/** Отклик на публикацию или ответ вызванного — одной формой. */
export function respondDuel(duelId: string, input: RespondDuelInput): Promise<DuelView> {
  return apiRequest<DuelView>(`/duels/${duelId}/responses`, { method: 'POST', body: input });
}

export function withdrawDuelResponse(responseId: string): Promise<DuelView> {
  return apiRequest<DuelView>(`/duel-responses/${responseId}/withdraw`, { method: 'POST' });
}

export function acceptDuelResponse(responseId: string): Promise<DuelView> {
  return apiRequest<DuelView>(`/duel-responses/${responseId}/accept`, { method: 'POST' });
}

export function declineDuelResponse(responseId: string): Promise<DuelView> {
  return apiRequest<DuelView>(`/duel-responses/${responseId}/decline`, { method: 'POST' });
}

/** Вызванный отказывается от вызова. */
export function declineDuel(duelId: string, input: DuelReasonInput): Promise<DuelView> {
  return apiRequest<DuelView>(`/duels/${duelId}/decline`, { method: 'POST', body: input });
}

export function cancelDuel(duelId: string, input: DuelReasonInput): Promise<DuelView> {
  return apiRequest<DuelView>(`/duels/${duelId}/cancel`, { method: 'POST', body: input });
}

export function reportDuel(duelId: string, input: ReportDuelInput): Promise<DuelView> {
  return apiRequest<DuelView>(`/duels/${duelId}/result`, { method: 'POST', body: input });
}

export function confirmDuel(duelId: string): Promise<DuelView> {
  return apiRequest<DuelView>(`/duels/${duelId}/confirm`, { method: 'POST' });
}

export function disputeDuel(duelId: string, input: DisputeDuelInput): Promise<DuelView> {
  return apiRequest<DuelView>(`/duels/${duelId}/dispute`, { method: 'POST', body: input });
}

// ---------------------------------------------------------------- администратор

export function listAdminDuels(
  query: Partial<ListAdminDuelsQuery>,
): Promise<Page<AdminDuelItemView>> {
  return apiRequest<Page<AdminDuelItemView>>(`/admin/duels${queryString(query)}`);
}

export async function resolveDuel(duelId: string, input: ResolveDuelInput): Promise<void> {
  await apiRequest<unknown>(`/admin/duels/${duelId}/resolve`, { method: 'POST', body: input });
}

export async function annulDuel(duelId: string, input: AnnulDuelInput): Promise<void> {
  await apiRequest<unknown>(`/admin/duels/${duelId}/annul`, { method: 'POST', body: input });
}
