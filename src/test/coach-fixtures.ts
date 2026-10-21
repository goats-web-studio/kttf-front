import type {
  AuthUserView,
  ClubTrainingsManageView,
  CoachApplicationView,
  CoachListItemView,
  CoachPlayerRef,
  CoachView,
  TrainingClubRef,
  TrainingCoachRef,
  TrainingGroupView,
  TrainingView,
} from '@kttf/shared/types';

import { CITIES, CLUB, PLAYERS, USER_WITH_PROFILE, cityRef } from './fixtures';

/**
 * Страница тренера — ответ `GET /coaches/by-slug/:slug` и `GET /coaches/:id`
 * (ADR-059). Построена на первом игроке фикстур.
 */
export const COACH_ID = '00000000-0000-4000-8000-0000000000d1';
export const COACH_SLUG = 'ivanov-ivan';

const PLAYER_REF: CoachPlayerRef = {
  id: PLAYERS.first.id,
  lastName: PLAYERS.first.lastName,
  firstName: PLAYERS.first.firstName,
  middleName: null,
  photoUrl: null,
  rating: PLAYERS.first.rating,
  isProvisional: false,
  city: cityRef(CITIES.almaty),
};

export const COACH_REF: TrainingCoachRef = {
  id: COACH_ID,
  slug: COACH_SLUG,
  player: PLAYER_REF,
  photoUrl: null,
  phone: '+7 701 123 45 67',
  whatsapp: '+7 701 123 45 67',
  telegram: 'coach_ivanov',
  primaryContact: 'WHATSAPP',
};

export const CLUB_REF: TrainingClubRef = {
  id: CLUB.id,
  name: CLUB.name,
  logoUrl: null,
  address: 'Абая 10',
  city: CLUB.city,
  twoGisUrl: null,
  phone: '+7 727 000 00 00',
  whatsapp: '+7 777 000 00 00',
  telegram: null,
  primaryContact: 'WHATSAPP',
};

/** Общие поля тренировки — каждая фикстура меняет своё. */
const TRAINING_BASE: TrainingView = {
  id: '00000000-0000-4000-8000-0000000000e0',
  author: 'COACH',
  kind: 'GROUP',
  audiences: ['AMATEURS'],
  kidsFromAge: null,
  place: 'VISIT',
  club: null,
  venue: null,
  coach: COACH_REF,
  link: 'NONE',
  booking: 'COACH',
  title: 'Тренировка',
  schedule: null,
  priceKzt: null,
  unit: 'NONE',
  note: null,
  description: null,
};

/** Детская группа тренера в клубе KTTF — клуб подтвердил. */
export const KIDS_GROUP: TrainingView = {
  ...TRAINING_BASE,
  id: '00000000-0000-4000-8000-0000000000e1',
  kind: 'KIDS_GROUP',
  audiences: ['KIDS'],
  kidsFromAge: 6,
  place: 'CLUB',
  club: CLUB_REF,
  link: 'CONFIRMED',
  title: 'Детская группа',
  schedule: 'пн, ср, пт 18:00–19:30',
  priceKzt: 20000,
  unit: 'MONTH',
};

/** Индивидуальная на выезде — второй стороны нет. */
export const VISIT_TRAINING: TrainingView = {
  ...TRAINING_BASE,
  id: '00000000-0000-4000-8000-0000000000e2',
  kind: 'INDIVIDUAL',
  title: 'Индивидуальная тренировка',
};

/** Тренировка в зале вне KTTF — названием и адресом. */
export const VENUE_TRAINING: TrainingView = {
  ...TRAINING_BASE,
  id: '00000000-0000-4000-8000-0000000000e3',
  kind: 'SPARRING',
  audiences: ['ATHLETES'],
  place: 'CLUB',
  venue: { name: 'Спортзал школы №5', address: 'Сатпаева 3' },
  title: 'Спарринг',
};

/** Вечерняя группа клуба, где тренер подтвердил участие. */
export const CLUB_EVENING: TrainingView = {
  ...TRAINING_BASE,
  id: '00000000-0000-4000-8000-0000000000e4',
  author: 'CLUB',
  booking: 'CLUB',
  place: 'CLUB',
  club: CLUB_REF,
  link: 'CONFIRMED',
  title: 'Вечерняя группа',
  schedule: 'вт, чт 19:00',
  priceKzt: 15000,
  unit: 'MONTH',
};

/** Приглашение клуба, ждущее ответа тренера. */
export const CLUB_INVITE: TrainingView = {
  ...CLUB_EVENING,
  id: '00000000-0000-4000-8000-0000000000e5',
  link: 'PENDING',
  title: 'Утренняя группа',
};

export const COACH: CoachView = {
  id: COACH_ID,
  slug: COACH_SLUG,
  player: PLAYER_REF,
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
  trainings: [KIDS_GROUP, VISIT_TRAINING, VENUE_TRAINING, CLUB_EVENING],
  trainingRequests: [],
  clubs: [],
  clubInvites: [],
  clubRequests: [],
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
  trainings: [],
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
  trainingsCount: 4,
  clubs: [{ id: CLUB.id, name: CLUB.name }],
  studentsCount: 24,
  profileReviewedAt: COACH.profileReviewedAt,
};

/** Ответ `GET /trainings`: клуб KTTF, зал вне KTTF, «выезд и онлайн». */
export const TRAINING_GROUPS: TrainingGroupView[] = [
  { kind: 'CLUB', club: CLUB_REF, venue: null, trainings: [KIDS_GROUP, CLUB_EVENING] },
  { kind: 'VENUE', club: null, venue: VENUE_TRAINING.venue, trainings: [VENUE_TRAINING] },
  { kind: 'ANYWHERE', club: null, venue: null, trainings: [VISIT_TRAINING] },
];

/** Тренировка тренера в клубе, ждущая ответа клуба. */
export const COACH_REQUEST: TrainingView = {
  ...KIDS_GROUP,
  id: '00000000-0000-4000-8000-0000000000e6',
  link: 'PENDING',
  title: 'Группа выходного дня',
};

/** Кабинет клуба: своя вечерняя группа, запрос тренера, подтверждённая тренерская. */
export const CLUB_MANAGE: ClubTrainingsManageView = {
  trainings: [CLUB_EVENING],
  requests: [COACH_REQUEST],
  coachTrainings: [KIDS_GROUP],
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
