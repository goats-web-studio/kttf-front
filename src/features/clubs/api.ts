import type {
  AddMemberInput,
  ClubMemberView,
  ClubView,
  CreateClubInput,
  ListClubsQuery,
  Page,
  UpdateClubInput,
} from '@kttf/shared/types';

import { apiRequest, queryString } from '@/common/api';

/** Контракт ТС 7.4. Права на правку и состав проверяет сервер (ТС 8.3). */

export function listClubs(query: ListClubsQuery): Promise<Page<ClubView>> {
  return apiRequest<Page<ClubView>>(`/clubs${queryString(query)}`);
}

export function fetchClub(id: string): Promise<ClubView> {
  return apiRequest<ClubView>(`/clubs/${id}`);
}

/** Создатель клуба сразу становится его владельцем — ТЗ 1. */
export function createClub(input: CreateClubInput): Promise<ClubView> {
  return apiRequest<ClubView>('/clubs', { method: 'POST', body: input });
}

export function updateClub(id: string, input: UpdateClubInput): Promise<ClubView> {
  return apiRequest<ClubView>(`/clubs/${id}`, { method: 'PATCH', body: input });
}

/** Состав публичен: ТЗ 3.2 показывает его на странице клуба. */
export function listClubMembers(id: string): Promise<readonly ClubMemberView[]> {
  return apiRequest<readonly ClubMemberView[]>(`/clubs/${id}/members`);
}

/** Убрать из состава. Последнего владельца сервер убрать не даст. */
export async function removeClubMember(id: string, userId: string): Promise<void> {
  await apiRequest<undefined>(`/clubs/${id}/members/${userId}`, { method: 'DELETE' });
}

/**
 * Добавить в состав — логином или телефоном (ADR-043).
 *
 * Уже состоящему в клубе меняет роль. Последнего владельца так не понизить.
 */
export function addClubMember(id: string, input: AddMemberInput): Promise<ClubMemberView> {
  return apiRequest<ClubMemberView>(`/clubs/${id}/members`, { method: 'POST', body: input });
}
