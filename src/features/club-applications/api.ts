import type {
  ClubApplicationView,
  CreateClubApplicationInput,
  ListClubApplicationsQuery,
  Page,
  UpdateClubApplicationInput,
} from '@kttf/shared/types';

import { apiRequest, queryString } from '@/common/api';

/**
 * Заявки клубов — ADR-047.
 *
 * Отправить может кто угодно, в том числе без входа. Список и отметка
 * «обработано» — у администратора платформы; права проверяет сервер
 * (ТС 8.3), отказ — `FORBIDDEN`.
 */

/** Ответ пустой: заявка либо принята, либо отказ с кодом. */
export async function sendClubApplication(input: CreateClubApplicationInput): Promise<void> {
  await apiRequest<undefined>('/club-applications', { method: 'POST', body: input });
}

export function listClubApplications(
  query: Partial<ListClubApplicationsQuery> = {},
): Promise<Page<ClubApplicationView>> {
  return apiRequest<Page<ClubApplicationView>>(`/admin/club-applications${queryString(query)}`);
}

export function updateClubApplication(
  id: string,
  input: UpdateClubApplicationInput,
): Promise<ClubApplicationView> {
  return apiRequest<ClubApplicationView>(`/admin/club-applications/${id}`, {
    method: 'PATCH',
    body: input,
  });
}
