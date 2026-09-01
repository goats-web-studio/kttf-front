import type { ClubView, ListClubsQuery, Page } from '@kttf/shared/types';

import { apiRequest, queryString } from '@/common/api';

/** Контракт ТС 7.4 в той части, которая нужна публичным экранам. */

export function listClubs(query: ListClubsQuery): Promise<Page<ClubView>> {
  return apiRequest<Page<ClubView>>(`/clubs${queryString(query)}`);
}

export function fetchClub(id: string): Promise<ClubView> {
  return apiRequest<ClubView>(`/clubs/${id}`);
}
