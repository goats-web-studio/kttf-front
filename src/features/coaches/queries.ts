import type { CoachStatus, ListCoachesRequest, ListTrainingsRequest } from '@kttf/shared/types';
import { queryOptions } from '@tanstack/react-query';

import {
  fetchClubStaff,
  fetchClubStaffManage,
  fetchClubTrainings,
  fetchClubTrainingsManage,
  fetchCoach,
  fetchCoachBySlug,
  fetchCoachStats,
  fetchCoachStudents,
  fetchCoachStudentsManage,
  fetchTraining,
  listCoachApplications,
  listCoaches,
  listTrainings,
} from './api';

/**
 * Ключи кэша тренеров. Всё под одним корнем: правка страницы в кабинете
 * сбрасывает и её публичный вид, и карточки в каталоге, и заявки у
 * администратора — это одна и та же страница.
 */
export const coachKeys = {
  all: ['coaches'] as const,
  list: (query: ListCoachesRequest) => ['coaches', 'list', query] as const,
  trainings: (query: ListTrainingsRequest) => ['coaches', 'trainings', query] as const,
  training: (id: string) => ['coaches', 'training', id] as const,
  bySlug: (slug: string) => ['coaches', 'slug', slug] as const,
  detail: (id: string) => ['coaches', 'detail', id] as const,
  stats: (id: string, days: number) => ['coaches', 'stats', id, days] as const,
  clubTrainings: (clubId: string) => ['coaches', 'club-trainings', clubId] as const,
  clubTrainingsManage: (clubId: string) => ['coaches', 'club-trainings-manage', clubId] as const,
  clubStaff: (clubId: string) => ['coaches', 'club-staff', clubId] as const,
  clubStaffManage: (clubId: string) => ['coaches', 'club-staff-manage', clubId] as const,
  students: (coachId: string) => ['coaches', 'students', coachId] as const,
  studentsManage: (coachId: string, page: number) =>
    ['coaches', 'students-manage', coachId, page] as const,
  applications: (status: CoachStatus | undefined, page: number) =>
    ['coaches', 'applications', status ?? 'all', page] as const,
};

export function coachesQuery(query: ListCoachesRequest) {
  return queryOptions({
    queryKey: coachKeys.list(query),
    // Сигнал отменяет запрос, ставший ненужным: в анкете текст поиска
    // меняется быстрее, чем отвечает сервер.
    queryFn: ({ signal }) => listCoaches(query, signal),
  });
}

export function trainingsQuery(query: ListTrainingsRequest) {
  return queryOptions({
    queryKey: coachKeys.trainings(query),
    queryFn: () => listTrainings(query),
  });
}

export function trainingQuery(id: string) {
  return queryOptions({
    queryKey: coachKeys.training(id),
    queryFn: () => fetchTraining(id),
  });
}

export function coachBySlugQuery(slug: string) {
  return queryOptions({
    queryKey: coachKeys.bySlug(slug),
    queryFn: () => fetchCoachBySlug(slug),
  });
}

export function coachQuery(id: string) {
  return queryOptions({
    queryKey: coachKeys.detail(id),
    queryFn: () => fetchCoach(id),
  });
}

/** Тренировки на публичной странице клуба. Под корнем тренеров: подтверждение связи меняет и их. */
export function clubTrainingsQuery(clubId: string) {
  return queryOptions({
    queryKey: coachKeys.clubTrainings(clubId),
    queryFn: () => fetchClubTrainings(clubId),
  });
}

export function clubTrainingsManageQuery(clubId: string) {
  return queryOptions({
    queryKey: coachKeys.clubTrainingsManage(clubId),
    queryFn: () => fetchClubTrainingsManage(clubId),
  });
}

export function coachStatsQuery(id: string, days: number) {
  return queryOptions({
    queryKey: coachKeys.stats(id, days),
    queryFn: () => fetchCoachStats(id, days),
  });
}

export function coachApplicationsQuery(status: CoachStatus | undefined, page: number) {
  return queryOptions({
    queryKey: coachKeys.applications(status, page),
    queryFn: () => listCoachApplications({ status, page }),
  });
}

/** Сколько ждут проверки — число на кнопке «Заявки» в кабинете, как у клубов. */
export const pendingCoachesCountQuery = queryOptions({
  queryKey: [...coachKeys.all, 'pending-count'] as const,
  queryFn: async () => (await listCoachApplications({ status: 'PENDING', limit: 1 })).total,
});

/** Тренерский штаб на странице клуба (T2). Под корнем тренеров: связи меняют обе стороны. */
export function clubStaffQuery(clubId: string) {
  return queryOptions({
    queryKey: coachKeys.clubStaff(clubId),
    queryFn: () => fetchClubStaff(clubId),
  });
}

export function clubStaffManageQuery(clubId: string) {
  return queryOptions({
    queryKey: coachKeys.clubStaffManage(clubId),
    queryFn: () => fetchClubStaffManage(clubId),
  });
}

/** Ученики на странице тренера (T2). */
export function coachStudentsQuery(coachId: string) {
  return queryOptions({
    queryKey: coachKeys.students(coachId),
    queryFn: () => fetchCoachStudents(coachId),
  });
}

/** Сколько учеников на странице кабинета. */
export const STUDENTS_PAGE = 20;

export function coachStudentsManageQuery(coachId: string, page: number) {
  return queryOptions({
    queryKey: coachKeys.studentsManage(coachId, page),
    queryFn: () => fetchCoachStudentsManage(coachId, { page, limit: STUDENTS_PAGE }),
  });
}
