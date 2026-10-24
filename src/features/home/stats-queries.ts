import type { HomeLeaders, HomePodiums, HomeStatsPeriod, HomeUpsets } from '@kttf/shared/types';
import { queryOptions } from '@tanstack/react-query';

import { apiRequest, queryString } from '@/common/api';

/** Живые блоки главной — ADR-071: призёры, статистика, лучшие победы. */
export const homeStatsKeys = {
  podiums: ['stats', 'podiums'] as const,
  leaders: (period: HomeStatsPeriod) => ['stats', 'leaders', period] as const,
  upsets: (period: HomeStatsPeriod) => ['stats', 'upsets', period] as const,
};

export const homePodiumsQuery = queryOptions({
  queryKey: homeStatsKeys.podiums,
  queryFn: () => apiRequest<HomePodiums>('/stats/podiums'),
});

export function homeLeadersQuery(period: HomeStatsPeriod) {
  return queryOptions({
    queryKey: homeStatsKeys.leaders(period),
    queryFn: () => apiRequest<HomeLeaders>(`/stats/leaders${queryString({ period })}`),
  });
}

export function homeUpsetsQuery(period: HomeStatsPeriod) {
  return queryOptions({
    queryKey: homeStatsKeys.upsets(period),
    queryFn: () => apiRequest<HomeUpsets>(`/stats/upsets${queryString({ period })}`),
  });
}
