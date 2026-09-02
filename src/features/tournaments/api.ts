import type {
  CreateTournamentInput,
  DuplicateTournamentInput,
  ListTournamentsQuery,
  Page,
  RegisterInput,
  RegistrationView,
  TournamentResultsView,
  TournamentView,
  UpdateRegistrationInput,
} from '@kttf/shared/types';

import { apiRequest, queryString } from '@/common/api';

/**
 * Контракт ТС 7.5, один в один.
 *
 * Запросы идут обычным путём, а не `anonymous`: чтение открыто без токена, но
 * токен, если он есть, добавляет организатору видимость его черновиков.
 * `anonymous` здесь отнял бы у вошедшего часть его же турниров.
 */

export function listTournaments(query: ListTournamentsQuery): Promise<Page<TournamentView>> {
  return apiRequest<Page<TournamentView>>(`/tournaments${queryString(query)}`);
}

/**
 * Создание турнира — ТЗ 4.2.
 *
 * Право на него проверяет сервер: заводить турнир может организатор
 * клуба-хозяина, а не всякий вошедший (ТС 8.3).
 */
export function createTournament(input: CreateTournamentInput): Promise<TournamentView> {
  return apiRequest<TournamentView>('/tournaments', { method: 'POST', body: input });
}

/**
 * «Повторить прошлый турнир» — ТЗ 4.2, обязательный механизм.
 *
 * Копирует сервер, а не форма. Собрать тело создания из прочитанного
 * турнира означало бы второе место, где перечислены все поля настроек, и
 * первое же новое поле их развело бы.
 */
export function duplicateTournament(
  id: string,
  input: DuplicateTournamentInput,
): Promise<TournamentView> {
  return apiRequest<TournamentView>(`/tournaments/${id}/duplicate`, {
    method: 'POST',
    body: input,
  });
}

export function fetchTournament(id: string): Promise<TournamentView> {
  return apiRequest<TournamentView>(`/tournaments/${id}`);
}

/** Публичные результаты — ТЗ 9.4. Открыты без входа. */
export function fetchTournamentResults(id: string): Promise<TournamentResultsView> {
  return apiRequest<TournamentResultsView>(`/tournaments/${id}/results`);
}

/**
 * Участники — ТС 7.5, ТЗ 4.3.
 *
 * Список открыт без входа: состав турнира виден всем, как и результаты.
 * Запись, правка и снятие требуют токена, а право на них проверяет сервер:
 * свой профиль записывает себя, чужого — только владелец или организатор
 * клуба-хозяина (ADR-014).
 */

export function listRegistrations(tournamentId: string): Promise<readonly RegistrationView[]> {
  return apiRequest<readonly RegistrationView[]>(`/tournaments/${tournamentId}/registrations`);
}

/** Без `playerId` человек записывает себя, с ним — организатор чужого. */
export function registerForTournament(
  tournamentId: string,
  input: RegisterInput,
): Promise<RegistrationView> {
  return apiRequest<RegistrationView>(`/tournaments/${tournamentId}/registrations`, {
    method: 'POST',
    body: input,
  });
}

export function updateRegistration(
  tournamentId: string,
  registrationId: string,
  input: UpdateRegistrationInput,
): Promise<RegistrationView> {
  return apiRequest<RegistrationView>(
    `/tournaments/${tournamentId}/registrations/${registrationId}`,
    { method: 'PATCH', body: input },
  );
}

/** Снятие записи. До старта турнира и до дедлайна — своей, организатором — любой. */
export async function removeRegistration(
  tournamentId: string,
  registrationId: string,
): Promise<void> {
  await apiRequest<undefined>(`/tournaments/${tournamentId}/registrations/${registrationId}`, {
    method: 'DELETE',
  });
}
