import {
  CHILD_AUDIENCES,
  coachImageVariant,
  type AchievementRole,
  type CoachCategory,
  type CoachLanguage,
  type CoachPlayerRef,
  type CoachRequirement,
  type CoachServiceView,
  type CoachStatus,
  type CredentialKind,
  type PriceUnit,
  type SportsRank,
  type TrainingAudience,
  type TrainingKind,
  type TrainingPlace,
} from '@kttf/shared/types';

import { fill, formatMoney, type Locale, type MessageKey } from '@/common/i18n';

/**
 * Перечни раздела «Тренировки» — в тексты интерфейса (ADR-059).
 *
 * Тип `Record` обязывает перечислить все значения: новое значение в общем
 * коде ломает сборку здесь, а не выходит к человеку английской строкой.
 */

export const TRAINING_KIND_KEYS: Readonly<Record<TrainingKind, MessageKey>> = {
  INDIVIDUAL: 'coach.kind.INDIVIDUAL',
  GROUP: 'coach.kind.GROUP',
  SPLIT: 'coach.kind.SPLIT',
  KIDS_GROUP: 'coach.kind.KIDS_GROUP',
  VIDEO_REVIEW: 'coach.kind.VIDEO_REVIEW',
  CAMP: 'coach.kind.CAMP',
  SPARRING: 'coach.kind.SPARRING',
  OTHER: 'coach.kind.OTHER',
};

export const TRAINING_AUDIENCE_KEYS: Readonly<Record<TrainingAudience, MessageKey>> = {
  KIDS: 'coach.audience.KIDS',
  TEENS: 'coach.audience.TEENS',
  ADULT_BEGINNERS: 'coach.audience.ADULT_BEGINNERS',
  AMATEURS: 'coach.audience.AMATEURS',
  ATHLETES: 'coach.audience.ATHLETES',
};

export const TRAINING_PLACE_KEYS: Readonly<Record<TrainingPlace, MessageKey>> = {
  CLUB: 'coach.place.CLUB',
  VISIT: 'coach.place.VISIT',
  ONLINE: 'coach.place.ONLINE',
};

export const COACH_LANGUAGE_KEYS: Readonly<Record<CoachLanguage, MessageKey>> = {
  KK: 'coach.language.KK',
  RU: 'coach.language.RU',
  EN: 'coach.language.EN',
};

export const SPORTS_RANK_KEYS: Readonly<Record<SportsRank, MessageKey>> = {
  YOUTH_3: 'coach.rank.YOUTH_3',
  YOUTH_2: 'coach.rank.YOUTH_2',
  YOUTH_1: 'coach.rank.YOUTH_1',
  RANK_3: 'coach.rank.RANK_3',
  RANK_2: 'coach.rank.RANK_2',
  RANK_1: 'coach.rank.RANK_1',
  KMS: 'coach.rank.KMS',
  MS: 'coach.rank.MS',
  MSMK: 'coach.rank.MSMK',
  ZMS: 'coach.rank.ZMS',
};

export const COACH_CATEGORY_KEYS: Readonly<Record<CoachCategory, MessageKey>> = {
  HIGHEST: 'coach.category.HIGHEST',
  FIRST: 'coach.category.FIRST',
  SECOND: 'coach.category.SECOND',
  NONE: 'coach.category.NONE',
};

export const CREDENTIAL_KIND_KEYS: Readonly<Record<CredentialKind, MessageKey>> = {
  DIPLOMA: 'coach.credential.DIPLOMA',
  CERTIFICATE: 'coach.credential.CERTIFICATE',
  COURSE: 'coach.credential.COURSE',
  LICENSE: 'coach.credential.LICENSE',
  OTHER: 'coach.credential.OTHER',
};

export const ACHIEVEMENT_ROLE_KEYS: Readonly<Record<AchievementRole, MessageKey>> = {
  AS_PLAYER: 'coach.achievement.AS_PLAYER',
  AS_COACH: 'coach.achievement.AS_COACH',
};

export const COACH_STATUS_KEYS: Readonly<Record<CoachStatus, MessageKey>> = {
  DRAFT: 'coach.status.DRAFT',
  PENDING: 'coach.status.PENDING',
  APPROVED: 'coach.status.APPROVED',
  REJECTED: 'coach.status.REJECTED',
};

/** Чего не хватает для отправки на проверку — `coachMissing`. */
export const COACH_REQUIREMENT_KEYS: Readonly<Record<CoachRequirement, MessageKey>> = {
  city: 'coach.missing.city',
  services: 'coach.missing.services',
};

export const PRICE_UNIT_KEYS: Readonly<Record<PriceUnit, MessageKey>> = {
  HOUR: 'club.price.unit.HOUR',
  VISIT: 'club.price.unit.VISIT',
  MONTH: 'club.price.unit.MONTH',
  COURSE: 'club.price.unit.COURSE',
  NONE: 'club.price.unit.NONE',
};

type T = (key: MessageKey) => string;

/** Фото тренера: своё со страницы, иначе из профиля игрока. */
export function coachPhoto(coach: {
  readonly photoUrl: string | null;
  readonly player: Pick<CoachPlayerRef, 'photoUrl'>;
}): string | null {
  return coach.photoUrl === null ? coach.player.photoUrl : coachImageVariant(coach.photoUrl, 480);
}

/** Есть ли что сказать в «Где тренирует»: город, форматы, районы выезда. */
export function hasWhere(coach: {
  readonly city: unknown;
  readonly formats: readonly TrainingPlace[];
  readonly visitAreas: string | null;
}): boolean {
  return coach.city !== null || coach.formats.length > 0 || coach.visitAreas !== null;
}

/** Имя в карточке: фамилия и имя, как в списках игроков. */
export function coachShortName(player: Pick<CoachPlayerRef, 'lastName' | 'firstName'>): string {
  return `${player.lastName} ${player.firstName}`;
}

/** Имя в шапке страницы — полное, с отчеством, если указано (07, 10.2). */
export function coachFullName(
  player: Pick<CoachPlayerRef, 'lastName' | 'firstName' | 'middleName'>,
): string {
  return player.middleName === null
    ? coachShortName(player)
    : `${coachShortName(player)} ${player.middleName}`;
}

/** «20 000 ₸ в месяц», «5 000 ₸» или «по договорённости» — цена необязательна. */
export function priceText(
  service: Pick<CoachServiceView, 'priceKzt' | 'unit'>,
  t: T,
  locale: Locale,
): string {
  if (service.priceKzt === null) return t('coach.price.negotiable');

  const money = formatMoney(service.priceKzt, locale);

  return service.unit === 'NONE' ? money : `${money} ${t(PRICE_UNIT_KEYS[service.unit])}`;
}

/** Тренировка для детей или подростков — у неё бывает «дети с N лет». */
export function isForChildren(audiences: readonly TrainingAudience[]): boolean {
  return audiences.some((audience) =>
    (CHILD_AUDIENCES as readonly TrainingAudience[]).includes(audience),
  );
}

/** С какого возраста берёт тренер: самый младший среди детских тренировок. */
export function youngestAge(
  services: readonly Pick<CoachServiceView, 'audiences' | 'kidsFromAge'>[],
): number | null {
  const ages = services
    .filter((service) => isForChildren(service.audiences))
    .flatMap((service) => (service.kidsFromAge === null ? [] : [service.kidsFromAge]));

  return ages.length === 0 ? null : Math.min(...ages);
}

/** «дети с 6 лет». */
export function kidsFromText(age: number, t: T): string {
  return fill(t('coach.kidsFrom'), { age: String(age) });
}

/**
 * Главная метка квалификации для карточки: звание или разряд, а без него —
 * тренерская категория. «Без категории» меткой не бывает: это не заслуга.
 */
export function mainQualification(
  coach: { readonly sportsRank: SportsRank | null; readonly coachCategory: CoachCategory | null },
  t: T,
): string | null {
  if (coach.sportsRank !== null) return t(SPORTS_RANK_KEYS[coach.sportsRank]);
  if (coach.coachCategory !== null && coach.coachCategory !== 'NONE') {
    return t(COACH_CATEGORY_KEYS[coach.coachCategory]);
  }

  return null;
}

/**
 * Метки шапки страницы: звание, тренерская категория, «дети с N лет»,
 * языки — в порядке `docs/11` 5.3.
 */
export function headerBadges(
  coach: {
    readonly sportsRank: SportsRank | null;
    readonly coachCategory: CoachCategory | null;
    readonly languages: readonly CoachLanguage[];
    readonly services: readonly Pick<CoachServiceView, 'audiences' | 'kidsFromAge'>[];
  },
  t: T,
): string[] {
  const badges: string[] = [];
  const age = youngestAge(coach.services);

  if (coach.sportsRank !== null) badges.push(t(SPORTS_RANK_KEYS[coach.sportsRank]));
  if (coach.coachCategory !== null && coach.coachCategory !== 'NONE') {
    badges.push(t(COACH_CATEGORY_KEYS[coach.coachCategory]));
  }
  if (age !== null) badges.push(kidsFromText(age, t));
  if (coach.languages.length > 0) {
    badges.push(coach.languages.map((language) => t(COACH_LANGUAGE_KEYS[language])).join(', '));
  }

  return badges;
}
