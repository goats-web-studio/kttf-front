import { useQuery } from '@tanstack/react-query';

import type { TrialInbox } from './inbox';
import { trialRequestsCountQuery } from './queries';

/**
 * Число новых заявок — метка на вкладке «Заявки». Пока ответа нет —
 * ноль: метка просто не показывается.
 */
export function useNewTrialRequests(inbox: TrialInbox): number {
  const count = useQuery(trialRequestsCountQuery(inbox)).data?.new;

  return typeof count === 'number' ? count : 0;
}
