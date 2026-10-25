import type { FollowTarget } from '@kttf/shared/types';
import { queryOptions } from '@tanstack/react-query';

import { fetchFollowState, fetchFollowSuggestions, fetchMyFollows } from './api';

export const followKeys = {
  all: ['follows'] as const,
  state: (type: FollowTarget, id: string, signedIn: boolean) =>
    ['follows', 'state', type, id, signedIn] as const,
  suggestions: (signedIn: boolean) => ['follows', 'suggestions', signedIn] as const,
};

export function followStateQuery(type: FollowTarget, id: string, signedIn: boolean) {
  return queryOptions({
    queryKey: followKeys.state(type, id, signedIn),
    queryFn: () => fetchFollowState(type, id),
  });
}

/** Рекомендаций в колонке главной. */
export const SUGGESTIONS = 5;

export function followSuggestionsQuery(signedIn: boolean) {
  return queryOptions({
    queryKey: followKeys.suggestions(signedIn),
    queryFn: () => fetchFollowSuggestions(SUGGESTIONS),
  });
}

export const myFollowsQuery = queryOptions({
  queryKey: ['follows', 'mine'] as const,
  queryFn: fetchMyFollows,
});
