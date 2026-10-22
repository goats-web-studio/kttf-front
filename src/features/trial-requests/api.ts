import type {
  AnswerTrialRequestInput,
  CreateTrialRequestInput,
  IncomingTrialRequestView,
  ListTrialRequestsQuery,
  Page,
  TrialRequestsCount,
  TrialRequestView,
} from '@kttf/shared/types';

import { apiRequest, queryString } from '@/common/api';

import { inboxPath, type TrialInbox } from './inbox';

/**
 * Заявки на пробную — ADR-059, T3. Отправляет только вошедший: имя и
 * телефон сервер берёт из аккаунта, в теле их нет.
 */

export function createTrialRequest(
  trainingId: string,
  input: CreateTrialRequestInput,
): Promise<TrialRequestView> {
  return apiRequest<TrialRequestView>(`/trainings/${trainingId}/trial-requests`, {
    method: 'POST',
    body: input,
  });
}

/** Свои заявки — «Мои заявки» на рабочем столе. */
export function listMyTrialRequests(
  query: ListTrialRequestsQuery,
): Promise<Page<TrialRequestView>> {
  return apiRequest<Page<TrialRequestView>>(`/me/trial-requests${queryString(query)}`);
}

/** Отозвать свою — только новую. */
export function cancelTrialRequest(id: string): Promise<TrialRequestView> {
  return apiRequest<TrialRequestView>(`/trial-requests/${id}/cancel`, { method: 'POST' });
}

/** Входящие тренера или клуба — вкладка «Заявки» кабинета. */
export function listInboxTrialRequests(
  inbox: TrialInbox,
  query: ListTrialRequestsQuery,
): Promise<Page<IncomingTrialRequestView>> {
  return apiRequest<Page<IncomingTrialRequestView>>(
    `${inboxPath(inbox)}/trial-requests${queryString(query)}`,
  );
}

/** Сколько новых — метка на вкладке. */
export function fetchTrialRequestsCount(inbox: TrialInbox): Promise<TrialRequestsCount> {
  return apiRequest<TrialRequestsCount>(`${inboxPath(inbox)}/trial-requests/count`);
}

/**
 * Ответ адресата. Что именно вернёт сервер — вид адресата или
 * отправителя, — экрану неважно: после ответа списки просто перечитываются.
 */
export async function answerTrialRequest(
  id: string,
  input: AnswerTrialRequestInput,
): Promise<void> {
  await apiRequest<unknown>(`/trial-requests/${id}/answer`, { method: 'POST', body: input });
}
