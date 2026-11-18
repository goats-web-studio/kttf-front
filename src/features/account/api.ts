import type {
  AccountRequestView,
  AccountStatusView,
  AdminAccountRequestView,
  ListAccountRequestsQuery,
  RejectAccountRequestInput,
  RequestAccountDeletionInput,
  RequestAccountRestoreInput,
} from '@kttf/shared/types';

import { apiRequest, queryString } from '@/common/api';

/**
 * Заявки по аккаунту — ADR-095.
 *
 * Удалить себя человек не может, только попросить: решает администратор.
 * Так же — восстановление архивного профиля: номер без SMS не подтверждён
 * (ADR-034), и историю к аккаунту привязывает только администратор.
 */

/** Что ждёт решения у вошедшего и есть ли архив по его номеру. */
export function getAccountStatus(): Promise<AccountStatusView> {
  return apiRequest<AccountStatusView>('/account/requests');
}

/** Заявка на удаление. Пароль — повторная проверка личности. */
export function requestAccountDeletion(
  input: RequestAccountDeletionInput,
): Promise<AccountRequestView> {
  return apiRequest<AccountRequestView>('/account/deletion-request', {
    method: 'POST',
    body: input,
  });
}

/** Отозвать свою ожидающую заявку на удаление. 204 без тела. */
export async function withdrawAccountDeletion(): Promise<void> {
  await apiRequest<undefined>('/account/deletion-request', { method: 'DELETE' });
}

/** Заявка вернуть архивный профиль новому аккаунту с тем же номером. */
export function requestAccountRestore(
  input: RequestAccountRestoreInput,
): Promise<AccountRequestView> {
  return apiRequest<AccountRequestView>('/account/restore-request', {
    method: 'POST',
    body: input,
  });
}

export function listAccountRequests(
  query: Partial<ListAccountRequestsQuery> = {},
): Promise<AdminAccountRequestView[]> {
  return apiRequest<AdminAccountRequestView[]>(`/admin/account-requests${queryString(query)}`);
}

export async function approveAccountRequest(id: string): Promise<void> {
  await apiRequest<undefined>(`/admin/account-requests/${id}/approve`, { method: 'POST' });
}

export async function rejectAccountRequest(
  id: string,
  input: RejectAccountRequestInput,
): Promise<void> {
  await apiRequest<undefined>(`/admin/account-requests/${id}/reject`, {
    method: 'POST',
    body: input,
  });
}
