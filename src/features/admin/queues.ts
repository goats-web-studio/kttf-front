import { useQuery } from '@tanstack/react-query';

import { newClubApplicationsCountQuery } from '@/features/club-applications/queries';
import { pendingCoachesCountQuery } from '@/features/coaches/queries';
import { adminDuelsQuery } from '@/features/duels/queries';
import { forumReportsQuery } from '@/features/forum/queries';

export interface AdminQueues {
  readonly applications: number;
  readonly coaches: number;
  readonly reports: number;
  readonly disputes: number;
  readonly total: number;
}

/**
 * Очереди администратора — сколько ждёт решения (ADR-075): заявки клубов и
 * тренеров, жалобы форума, споры дуэлей. Не администратору запросы не идут.
 */
export function useAdminQueues(enabled: boolean): AdminQueues {
  const applications = useQuery({ ...newClubApplicationsCountQuery, enabled }).data ?? 0;
  const coaches = useQuery({ ...pendingCoachesCountQuery, enabled }).data ?? 0;
  const reports =
    useQuery({ ...forumReportsQuery({ status: 'OPEN', limit: 1 }), enabled }).data?.total ?? 0;
  const disputes =
    useQuery({ ...adminDuelsQuery({ status: 'DISPUTED', limit: 1 }), enabled }).data?.total ?? 0;

  return {
    applications,
    coaches,
    reports,
    disputes,
    total: applications + coaches + reports + disputes,
  };
}
