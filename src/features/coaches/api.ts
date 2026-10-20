import type {
  CoachApplicationView,
  CoachEventKind,
  CoachListItemView,
  CoachStatsView,
  CoachStatus,
  CoachView,
  ListCoachesRequest,
  ListTrainingsRequest,
  Page,
  SetCoachAchievementsInput,
  SetCoachCredentialsInput,
  SetClubTrainingsInput,
  SetCoachTrainingsInput,
  TrafficSource,
  TrainingDetailView,
  TrainingGroupView,
  TrainingView,
  ClubTrainingsManageView,
  UpdateCoachInput,
  UploadedFile,
  UploadedImage,
} from '@kttf/shared/types';

import { API_BASE_URL, apiBlob, apiRequest, queryString } from '@/common/api';

/**
 * Раздел «Тренировки» — ADR-059, `docs/11`, контракт `@kttf/shared/types/coach`.
 *
 * Чтение публично: каталог тренировок, тренеры, страница по адресу. Правка —
 * владельцу страницы и администратору; права проверяет сервер (ТС 8.3).
 */

export function listCoaches(query: ListCoachesRequest): Promise<Page<CoachListItemView>> {
  return apiRequest<Page<CoachListItemView>>(`/coaches${queryString(query)}`);
}

/** Тренировки блоками по месту: клуб KTTF, зал вне KTTF, «выезд и онлайн». Страница считает блоки. */
export function listTrainings(query: ListTrainingsRequest): Promise<Page<TrainingGroupView>> {
  return apiRequest<Page<TrainingGroupView>>(`/trainings${queryString(query)}`);
}

/** Страница по адресу. С токеном владелец и администратор видят и неопубликованную. */
export function fetchCoachBySlug(slug: string): Promise<CoachView> {
  return apiRequest<CoachView>(`/coaches/by-slug/${encodeURIComponent(slug)}`);
}

export function fetchCoach(id: string): Promise<CoachView> {
  return apiRequest<CoachView>(`/coaches/${id}`);
}

/** «Стать тренером»: страница заводится черновиком на профиле вошедшего. */
export function createCoach(): Promise<CoachView> {
  return apiRequest<CoachView>('/coaches', { method: 'POST' });
}

export function updateCoach(id: string, input: UpdateCoachInput): Promise<CoachView> {
  return apiRequest<CoachView>(`/coaches/${id}`, { method: 'PATCH', body: input });
}

/**
 * Свои тренировки тренера целиком: порядок строк — порядок в списке, `id`
 * строки сохраняет тренировку и её связь с клубом.
 */
export function setCoachTrainings(id: string, input: SetCoachTrainingsInput): Promise<unknown> {
  return apiRequest<unknown>(`/coaches/${id}/trainings`, { method: 'PUT', body: input });
}

/** Страница тренировки — «Подробнее»: сама тренировка и другие у того же владельца. */
export function fetchTraining(id: string): Promise<TrainingDetailView> {
  return apiRequest<TrainingDetailView>(`/trainings/${id}`);
}

// ---------------------------------------------------------------- тренировки клуба

/** Публично: тренировки клуба и подтверждённые тренерские в нём. */
export function fetchClubTrainings(clubId: string): Promise<TrainingView[]> {
  return apiRequest<TrainingView[]>(`/clubs/${clubId}/trainings`);
}

/** Кабинет клуба (OWNER, ORGANIZER): свои, входящие от тренеров, подтверждённые тренерские. */
export function fetchClubTrainingsManage(clubId: string): Promise<ClubTrainingsManageView> {
  return apiRequest<ClubTrainingsManageView>(`/clubs/${clubId}/trainings/manage`);
}

/** Свои тренировки клуба целиком; смена тренера у строки — снова ждёт подтверждения. */
export function setClubTrainings(clubId: string, input: SetClubTrainingsInput): Promise<unknown> {
  return apiRequest<unknown>(`/clubs/${clubId}/trainings`, { method: 'PUT', body: input });
}

/** Вторая сторона подтверждает связь: клуб — тренера в своём зале, тренер — участие в клубной. */
export async function confirmTraining(id: string): Promise<void> {
  await apiRequest<unknown>(`/trainings/${id}/confirm`, { method: 'POST' });
}

/** Отказ или разрыв связи — любой из сторон. */
export async function declineTraining(id: string): Promise<void> {
  await apiRequest<unknown>(`/trainings/${id}/decline`, { method: 'POST' });
}

export function setCoachCredentials(
  id: string,
  input: SetCoachCredentialsInput,
): Promise<CoachView> {
  return apiRequest<CoachView>(`/coaches/${id}/credentials`, { method: 'PUT', body: input });
}

export function setCoachAchievements(
  id: string,
  input: SetCoachAchievementsInput,
): Promise<CoachView> {
  return apiRequest<CoachView>(`/coaches/${id}/achievements`, { method: 'PUT', body: input });
}

/** «Всё актуально» — страница проверена без правок. */
export function markCoachReviewed(id: string): Promise<CoachView> {
  return apiRequest<CoachView>(`/coaches/${id}/reviewed`, { method: 'POST' });
}

/** «Отправить на проверку». Отказ `COACH_INCOMPLETE` несёт `details.missing`. */
export function submitCoach(id: string): Promise<CoachView> {
  return apiRequest<CoachView>(`/coaches/${id}/submit`, { method: 'POST' });
}

export function fetchCoachStats(id: string, days: number): Promise<CoachStatsView> {
  return apiRequest<CoachStatsView>(`/coaches/${id}/stats${queryString({ days })}`);
}

/** Фото или обложка. Путь кладётся в страницу отдельной правкой, как у клуба. */
export function uploadCoachImage(id: string, file: File): Promise<UploadedImage> {
  const form = new FormData();

  form.append('file', file);

  return apiRequest<UploadedImage>(`/files/coaches/${id}`, { method: 'POST', body: form });
}

/** Скан документа. Путь уходит в строку документа при сохранении списка. */
export function uploadCoachDoc(id: string, file: File): Promise<UploadedFile> {
  const form = new FormData();

  form.append('file', file);

  return apiRequest<UploadedFile>(`/files/coach-docs/${id}`, { method: 'POST', body: form });
}

/**
 * Путь скана от корня API. Сервер отдаёт его полным (`/api/v1/coaches/…`),
 * а клиент сам приставляет базу — иначе префикс задвоится.
 */
export function apiRelative(url: string): string {
  return url.startsWith(API_BASE_URL) ? url.slice(API_BASE_URL.length) : url;
}

/** Непубличный скан — только с токеном владельца или администратора. */
export function fetchCredentialFile(url: string): Promise<Blob> {
  return apiBlob(apiRelative(url));
}

/**
 * Событие страницы тренера — без ожидания ответа, как у клуба: `sendBeacon`
 * доходит, даже если браузер уже уходит в WhatsApp или звонилку.
 */
export function sendCoachEvent(id: string, kind: CoachEventKind, source: TrafficSource): void {
  const url = `${API_BASE_URL}/coaches/${id}/events`;
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

// ---------------------------------------------------------------- администратор

export function listCoachApplications(query: {
  readonly status?: CoachStatus | undefined;
  readonly page?: number;
  readonly limit?: number;
}): Promise<Page<CoachApplicationView>> {
  return apiRequest<Page<CoachApplicationView>>(`/admin/coaches${queryString(query)}`);
}

export function approveCoach(id: string): Promise<CoachView> {
  return apiRequest<CoachView>(`/admin/coaches/${id}/approve`, { method: 'POST' });
}

export function rejectCoach(id: string, reason: string): Promise<CoachView> {
  return apiRequest<CoachView>(`/admin/coaches/${id}/reject`, {
    method: 'POST',
    body: { reason },
  });
}

export function setCoachHidden(id: string, hidden: boolean, reason?: string): Promise<CoachView> {
  return apiRequest<CoachView>(`/admin/coaches/${id}/hidden`, {
    method: 'PATCH',
    body: reason === undefined ? { hidden } : { hidden, reason },
  });
}

export function verifyCoachCredential(
  id: string,
  credentialId: string,
  verified: boolean,
): Promise<CoachView> {
  return apiRequest<CoachView>(`/admin/coaches/${id}/credentials/${credentialId}`, {
    method: 'PATCH',
    body: { verified },
  });
}
