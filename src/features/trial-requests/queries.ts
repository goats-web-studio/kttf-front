import type { ListTrialRequestsQuery } from '@kttf/shared/types';
import { queryOptions } from '@tanstack/react-query';

import { fetchTrialRequestsCount, listInboxTrialRequests, listMyTrialRequests } from './api';
import type { TrialInbox } from './inbox';

/**
 * Ключи — под одним корнем: отправка, ответ и отзыв меняют и свои
 * заявки, и входящие, и метку числа новых.
 */
export const trialRequestKeys = {
  all: ['trial-requests'] as const,
  mine: (query: ListTrialRequestsQuery) => ['trial-requests', 'mine', query] as const,
  inbox: (inbox: TrialInbox, query: ListTrialRequestsQuery) =>
    ['trial-requests', 'inbox', inbox.kind, inbox.id, query] as const,
  count: (inbox: TrialInbox) => ['trial-requests', 'count', inbox.kind, inbox.id] as const,
};

export function myTrialRequestsQuery(query: ListTrialRequestsQuery) {
  return queryOptions({
    queryKey: trialRequestKeys.mine(query),
    queryFn: () => listMyTrialRequests(query),
  });
}

export function inboxTrialRequestsQuery(inbox: TrialInbox, query: ListTrialRequestsQuery) {
  return queryOptions({
    queryKey: trialRequestKeys.inbox(inbox, query),
    queryFn: () => listInboxTrialRequests(inbox, query),
  });
}

export function trialRequestsCountQuery(inbox: TrialInbox) {
  return queryOptions({
    queryKey: trialRequestKeys.count(inbox),
    queryFn: () => fetchTrialRequestsCount(inbox),
  });
}
