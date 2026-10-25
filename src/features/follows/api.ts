import type { Followed, FollowState, FollowSuggestion, FollowTarget } from '@kttf/shared/types';

import { apiRequest } from '@/common/api';

/** Подписки — ADR-073. */
export function fetchFollowState(type: FollowTarget, id: string): Promise<FollowState> {
  return apiRequest<FollowState>(`/follows/${type}/${id}`);
}

export function setFollow(type: FollowTarget, id: string, on: boolean): Promise<FollowState> {
  return apiRequest<FollowState>(`/follows/${type}/${id}`, { method: on ? 'PUT' : 'DELETE' });
}

export function fetchFollowSuggestions(limit: number): Promise<FollowSuggestion[]> {
  return apiRequest<FollowSuggestion[]>(`/follows/suggestions?limit=${String(limit)}`);
}

/** На кого подписан вошедший — кабинет «Подписки». */
export function fetchMyFollows(): Promise<Followed[]> {
  return apiRequest<Followed[]>('/follows/mine');
}
