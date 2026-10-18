import type { ClubApplicationStatus } from '@kttf/shared/types';
import { queryOptions } from '@tanstack/react-query';

import { listClubApplications } from './api';

export const clubApplicationKeys = {
  all: ['club-applications'] as const,
  list: (status: ClubApplicationStatus | undefined, page: number) =>
    ['club-applications', status ?? 'all', page] as const,
};

/** Страница заявок у администратора; без статуса — все. */
export function clubApplicationsQuery(status: ClubApplicationStatus | undefined, page: number) {
  return queryOptions({
    queryKey: clubApplicationKeys.list(status, page),
    queryFn: () => listClubApplications({ status, page }),
  });
}

/**
 * Сколько новых — число на карточке администратора в кабинете. Нужен
 * только `total`, поэтому страница из одной строки.
 */
export const newClubApplicationsCountQuery = queryOptions({
  queryKey: [...clubApplicationKeys.all, 'new-count'] as const,
  queryFn: async () => (await listClubApplications({ status: 'NEW', limit: 1 })).total,
});
