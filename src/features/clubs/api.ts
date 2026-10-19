import type {
  AddMemberInput,
  ClubEventKind,
  ClubListItemView,
  ClubMemberView,
  ClubStatsView,
  ClubSummaryView,
  ClubView,
  CreateClubInput,
  ListClubsRequest,
  Page,
  SetClubHoursInput,
  SetClubPricesInput,
  TrafficSource,
  UpdateClubInput,
  UploadedImage,
} from '@kttf/shared/types';

import { apiRequest, queryString } from '@/common/api';

/** Контракт ТС 7.4. Права на правку и состав проверяет сервер (ТС 8.3). */

export function listClubs(query: ListClubsRequest): Promise<Page<ClubListItemView>> {
  return apiRequest<Page<ClubListItemView>>(`/clubs${queryString(query)}`);
}

export function fetchClub(id: string): Promise<ClubView> {
  return apiRequest<ClubView>(`/clubs/${id}`);
}

/** Создатель клуба сразу становится его владельцем — ТЗ 1. */
export function createClub(input: CreateClubInput): Promise<ClubView> {
  return apiRequest<ClubView>('/clubs', { method: 'POST', body: input });
}

export function updateClub(id: string, input: UpdateClubInput): Promise<ClubView> {
  return apiRequest<ClubView>(`/clubs/${id}`, { method: 'PATCH', body: input });
}

/** Состав публичен: ТЗ 3.2 показывает его на странице клуба. */
export function listClubMembers(id: string): Promise<readonly ClubMemberView[]> {
  return apiRequest<readonly ClubMemberView[]>(`/clubs/${id}/members`);
}

/** Убрать из состава. Последнего владельца сервер убрать не даст. */
export async function removeClubMember(id: string, userId: string): Promise<void> {
  await apiRequest<undefined>(`/clubs/${id}/members/${userId}`, { method: 'DELETE' });
}

/**
 * Добавить в состав — логином или телефоном (ADR-043).
 *
 * Уже состоящему в клубе меняет роль. Последнего владельца так не понизить.
 */
export function addClubMember(id: string, input: AddMemberInput): Promise<ClubMemberView> {
  return apiRequest<ClubMemberView>(`/clubs/${id}/members`, { method: 'POST', body: input });
}

/** Часы работы неделей целиком — ADR-055. */
export function setClubHours(id: string, input: SetClubHoursInput): Promise<ClubView> {
  return apiRequest<ClubView>(`/clubs/${id}/hours`, { method: 'PUT', body: input });
}

/** Прайс целиком: порядок строк — порядок в списке. */
export function setClubPrices(id: string, input: SetClubPricesInput): Promise<ClubView> {
  return apiRequest<ClubView>(`/clubs/${id}/prices`, { method: 'PUT', body: input });
}

/** «Всё актуально» — страница проверена без правок. */
export function markClubReviewed(id: string): Promise<ClubView> {
  return apiRequest<ClubView>(`/clubs/${id}/reviewed`, { method: 'POST' });
}

/** Скрыть из каталога — администратор. */
export function setClubHidden(id: string, hidden: boolean): Promise<ClubView> {
  return apiRequest<ClubView>(`/clubs/${id}/hidden`, { method: 'PATCH', body: { hidden } });
}

/** Живые данные клуба: встречи и игроки за месяц, призёры последних турниров. */
export function fetchClubSummary(id: string): Promise<ClubSummaryView> {
  return apiRequest<ClubSummaryView>(`/clubs/${id}/summary`);
}

/** Статистика обращений — только составу клуба. */
export function fetchClubStats(id: string, days: number): Promise<ClubStatsView> {
  return apiRequest<ClubStatsView>(`/clubs/${id}/stats${queryString({ days })}`);
}

/**
 * Логотип или обложка. Путь сохраняется в клубе отдельной правкой: человек
 * видит картинку до того, как нажал «сохранить», — как с фото игрока.
 */
export function uploadClubImage(id: string, file: File): Promise<UploadedImage> {
  const form = new FormData();

  form.append('file', file);

  return apiRequest<UploadedImage>(`/files/clubs/${id}`, { method: 'POST', body: form });
}

/**
 * Событие страницы клуба — без ожидания ответа.
 *
 * `sendBeacon` доходит, даже если человек нажал «Позвонить» и браузер уже
 * уходит в звонилку: обычный запрос в этот момент обрывается. Ошибка учёта
 * человеку не показывается — это число для клуба, а не действие человека.
 */
export function sendClubEvent(id: string, kind: ClubEventKind, source: TrafficSource): void {
  const url = `/api/v1/clubs/${id}/events`;
  const body = JSON.stringify({ kind, source });

  if (typeof navigator.sendBeacon === 'function') {
    navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));

    return;
  }

  void fetch(url, {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/json' },
    keepalive: true,
  }).catch(() => undefined);
}
