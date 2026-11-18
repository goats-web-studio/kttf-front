import type { AccountRequestStatus } from '@kttf/shared/types';
import { queryOptions } from '@tanstack/react-query';

import { getAccountStatus, listAccountRequests } from './api';

export const accountRequestKeys = {
  all: ['account-requests'] as const,
  status: ['account-requests', 'mine'] as const,
  admin: (status: AccountRequestStatus | undefined) =>
    ['account-requests', 'admin', status ?? 'all'] as const,
};

/** Свои заявки и признак архива по номеру — настройки и кабинет. */
export const accountStatusQuery = queryOptions({
  queryKey: accountRequestKeys.status,
  queryFn: getAccountStatus,
});

/** Заявки у администратора; без статуса — все. */
export function adminAccountRequestsQuery(status: AccountRequestStatus | undefined) {
  return queryOptions({
    queryKey: accountRequestKeys.admin(status),
    queryFn: () => listAccountRequests(status === undefined ? {} : { status }),
  });
}
