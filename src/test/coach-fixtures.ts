import type {
  AuthUserView,
  CoachApplicationView,
  CoachListItemView,
  CoachView,
  TrainingListItemView,
} from '@kttf/shared/types';

import { CITIES, PLAYERS, USER_WITH_PROFILE, cityRef } from './fixtures';

/**
 * Страница тренера — ответ `GET /coaches/by-slug/:slug` и `GET /coaches/:id`
 * (ADR-059). Построена на первом игроке фикстур.
 */
export const COACH_ID = '00000000-0000-4000-8000-0000000000d1';
export const COACH_SLUG = 'ivanov-ivan';

/** Детская группа с ценой и возрастом — первая тренировка страницы. */
const KIDS_GROUP: CoachView['services'][number] = {
  id: '00000000-0000-4000-8000-0000000000e1',
  kind: 'KIDS_GROUP',
  audiences: ['KIDS'],
  kidsFromAge: 6,
  place: 'CLUB',
  title: 'Детская группа',
  schedule: 'пн, ср, пт 18:00–19:30',
  priceKzt: 20000,
  unit: 'MONTH',
  note: null,
};

export const COACH: CoachView = {
  id: COACH_ID,
  slug: COACH_SLUG,
  player: {
    id: PLAYERS.first.id,
    lastName: PLAYERS.first.lastName,
    firstName: PLAYERS.first.firstName,
    middleName: null,
    photoUrl: null,
    rating: PLAYERS.first.rating,
    isProvisional: false,
    city: cityRef(CITIES.almaty),
  },
  status: 'APPROVED',
  rejectReason: null,
  reviewedAt: '2026-10-10T10:00:00.000Z',
  hidden: false,
  hiddenReason: null,
  headline: 'Детский тренер, Бостандыкский район',
  about: 'Тренирую детей с 2015 года.\nВторая строка.',
  photoUrl: null,
  coverUrl: null,
  coachingSince: 2015,
  city: cityRef(CITIES.almaty),
  formats: ['CLUB', 'VISIT'],
  visitAreas: 'Бостандыкский, Медеуский',
  languages: ['KK', 'RU'],
  phone: '+7 701 123 45 67',
  whatsapp: '+7 701 123 45 67',
  telegram: 'coach_ivanov',
  instagram: null,
  primaryContact: 'WHATSAPP',
  sportsRank: 'KMS',
  coachCategory: 'HIGHEST',
  refereeCategory: null,
  education: 'КазАСТ, тренер-преподаватель, 2014',
  services: [
    KIDS_GROUP,
    {
      id: '00000000-0000-4000-8000-0000000000e2',
      kind: 'INDIVIDUAL',
      audiences: ['AMATEURS'],
      kidsFromAge: null,
      place: 'VISIT',
      title: 'Индивидуальная тренировка',
      schedule: null,
      priceKzt: null,
      unit: 'NONE',
      note: null,
    },
  ],
  credentials: [
    {
      id: '00000000-0000-4000-8000-0000000000f1',
      kind: 'DIPLOMA',
      title: 'Диплом тренера-преподавателя',
      issuer: 'КазАСТ',
      year: 2014,
      hasFile: true,
      filePublic: false,
      fileUrl: null,
      file: null,
      verifiedAt: '2026-10-11T10:00:00.000Z',
    },
  ],
  achievements: [
    {
      id: '00000000-0000-4000-8000-0000000000a1',
      role: 'AS_PLAYER',
      year: 2012,
      title: 'Чемпион РК в паре',
    },
  ],
  studentsCount: 24,
  profileReviewedAt: '2026-10-15T10:00:00.000Z',
  createdAt: '2026-10-01T10:00:00.000Z',
};

/** Черновик без города и тренировок — к отправке на проверку не готов. */
export const DRAFT_COACH: CoachView = {
  ...COACH,
  status: 'DRAFT',
  reviewedAt: null,
  city: null,
  services: [],
};

export const COACH_LIST_ITEM: CoachListItemView = {
  id: COACH.id,
  slug: COACH.slug,
  player: COACH.player,
  headline: COACH.headline,
  photoUrl: null,
  city: COACH.city,
  formats: COACH.formats,
  languages: COACH.languages,
  sportsRank: COACH.sportsRank,
  coachCategory: COACH.coachCategory,
  coachingSince: COACH.coachingSince,
  minPriceKzt: 8000,
  servicesCount: 2,
  studentsCount: 24,
  profileReviewedAt: COACH.profileReviewedAt,
};

export const TRAINING_ITEM: TrainingListItemView = {
  ...KIDS_GROUP,
  coach: {
    id: COACH.id,
    slug: COACH.slug,
    player: COACH.player,
    photoUrl: null,
    city: COACH.city,
    languages: COACH.languages,
    studentsCount: 24,
  },
};

export const COACH_APPLICATION: CoachApplicationView = {
  ...COACH,
  status: 'PENDING',
  submittedAt: '2026-10-19T10:00:00.000Z',
};

/** Игрок со страницей тренера в сессии. */
export function userWithCoach(coach: Pick<CoachView, 'id' | 'slug' | 'status'>): AuthUserView {
  return { ...USER_WITH_PROFILE, coach: { id: coach.id, slug: coach.slug, status: coach.status } };
}
