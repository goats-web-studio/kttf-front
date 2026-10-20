import {
  setCoachAchievementsSchema,
  setCoachCredentialsSchema,
  updateCoachSchema,
  type AchievementRole,
  type CoachAchievementInput,
  type CoachCategory,
  type CoachCredentialInput,
  type CoachLanguage,
  type CoachView,
  type ContactKind,
  type CredentialKind,
  type SportsRank,
  type TrainingPlace,
  type UpdateCoachInput,
} from '@kttf/shared/types';

import { telegramHandle } from '@/features/clubs/contacts';

/**
 * Формы кабинета тренера — в тела запросов (ADR-059).
 *
 * Поля форм — строки, как их вписал человек: цена «20 000», год «2015»,
 * Telegram «@coach». Здесь они становятся тем, что ждёт контракт, и
 * проверяются той же схемой, что и на сервере: форма отказывает тому же,
 * чему отказал бы сервер, не дожидаясь ответа.
 */

/** Две колонки полей от планшета, одна на телефоне. */
export const FIELDS_GRID = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  alignItems: 'start',
} as const;

let nextKey = 0;

/** Ключ строки списка — для перестановки и React, на сервер не уходит. */
export function newRowKey(): string {
  nextKey += 1;
  return `row-${String(nextKey)}`;
}

/** Пустая строка — `null`, остальное без краёв. */
export function textOrNull(value: string): string | null {
  const trimmed = value.trim();

  return trimmed === '' ? null : trimmed;
}

/** Целое из строки с пробелами разрядов: «20 000» → 20000. Пустое — `null`, кривое — `NaN`. */
export function parseInteger(value: string): number | null {
  const digits = value.replace(/\s/g, '');

  if (digits === '') return null;

  return /^\d+$/.test(digits) ? Number(digits) : Number.NaN;
}

// ---------------------------------------------------------------- страница

/** Поля, которые правятся вкладками «Страница» и «Квалификация» одним PATCH. */
export interface CoachFieldsForm {
  readonly headline: string;
  readonly cityId: string;
  readonly coachingSince: string;
  readonly formats: readonly TrainingPlace[];
  readonly visitAreas: string;
  readonly languages: readonly CoachLanguage[];
  readonly phone: string;
  readonly whatsapp: string;
  readonly telegram: string;
  readonly instagram: string;
  readonly primaryContact: ContactKind | '';
  readonly about: string;
  readonly sportsRank: SportsRank | '';
  readonly coachCategory: CoachCategory | '';
  readonly refereeCategory: string;
  readonly education: string;
}

export function coachFieldsOf(coach: CoachView): CoachFieldsForm {
  return {
    headline: coach.headline ?? '',
    cityId: coach.city?.id ?? '',
    coachingSince: coach.coachingSince === null ? '' : String(coach.coachingSince),
    formats: coach.formats,
    visitAreas: coach.visitAreas ?? '',
    languages: coach.languages,
    phone: coach.phone ?? '',
    whatsapp: coach.whatsapp ?? '',
    telegram: coach.telegram ?? '',
    instagram: coach.instagram ?? '',
    primaryContact: coach.primaryContact ?? '',
    about: coach.about ?? '',
    sportsRank: coach.sportsRank ?? '',
    coachCategory: coach.coachCategory ?? '',
    refereeCategory: coach.refereeCategory ?? '',
    education: coach.education ?? '',
  };
}

type Fields = Required<Omit<UpdateCoachInput, 'photoUrl' | 'coverUrl'>>;

/** Значения формы в виде контракта: пустое — `null`, списки — как есть. */
function fieldsOf(form: CoachFieldsForm): Fields {
  const telegram = textOrNull(form.telegram);

  return {
    headline: textOrNull(form.headline),
    about: textOrNull(form.about),
    coachingSince: parseInteger(form.coachingSince),
    cityId: textOrNull(form.cityId),
    formats: [...form.formats],
    visitAreas: textOrNull(form.visitAreas),
    languages: [...form.languages],
    phone: textOrNull(form.phone),
    whatsapp: textOrNull(form.whatsapp),
    telegram: telegram === null ? null : telegramHandle(telegram),
    instagram: textOrNull(form.instagram),
    primaryContact: form.primaryContact === '' ? null : form.primaryContact,
    sportsRank: form.sportsRank === '' ? null : form.sportsRank,
    coachCategory: form.coachCategory === '' ? null : form.coachCategory,
    refereeCategory: textOrNull(form.refereeCategory),
    education: textOrNull(form.education),
  };
}

/** Текущие значения страницы в том же виде — для сравнения. */
function fieldsOfCoach(coach: CoachView): Fields {
  return fieldsOf(coachFieldsOf(coach));
}

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

export type PatchResult =
  | { readonly kind: 'unchanged' }
  | { readonly kind: 'invalid'; readonly fields: readonly string[] }
  | { readonly kind: 'patch'; readonly patch: UpdateCoachInput };

/**
 * Только изменённые поля из перечисленных: вкладка «Страница» не трогает
 * квалификацию, и наоборот (ADR-043: отсутствие поля его не меняет).
 */
export function coachPatch(
  coach: CoachView,
  form: CoachFieldsForm,
  keys: readonly (keyof Fields)[],
): PatchResult {
  const next = fieldsOf(form);
  const current = fieldsOfCoach(coach);
  const patch: Record<string, unknown> = {};

  for (const key of keys) {
    if (!same(next[key], current[key])) patch[key] = next[key];
  }

  if (Object.keys(patch).length === 0) return { kind: 'unchanged' };

  const parsed = updateCoachSchema.safeParse(patch);

  if (!parsed.success) {
    return {
      kind: 'invalid',
      fields: [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? '')))],
    };
  }

  return { kind: 'patch', patch: parsed.data };
}

export const PAGE_FIELDS = [
  'headline',
  'cityId',
  'coachingSince',
  'formats',
  'visitAreas',
  'languages',
  'phone',
  'whatsapp',
  'telegram',
  'instagram',
  'primaryContact',
  'about',
] as const satisfies readonly (keyof Fields)[];

export const QUALIFICATION_FIELDS = [
  'sportsRank',
  'coachCategory',
  'refereeCategory',
  'education',
] as const satisfies readonly (keyof Fields)[];

// ---------------------------------------------------------------- документы

export interface CredentialRow {
  readonly key: string;
  /** Есть у сохранённого документа: сохраняет его и отметку «проверено KTTF». */
  readonly id: string | undefined;
  readonly kind: CredentialKind;
  readonly title: string;
  readonly issuer: string;
  readonly year: string;
  /** Путь загруженного скана. */
  readonly file: string | null;
  readonly filePublic: boolean;
  /** Только для чтения: ставит администратор. */
  readonly verifiedAt: string | null;
}

export function credentialRowsOf(coach: CoachView): CredentialRow[] {
  return coach.credentials.map((credential) => ({
    key: newRowKey(),
    id: credential.id,
    kind: credential.kind,
    title: credential.title,
    issuer: credential.issuer ?? '',
    year: credential.year === null ? '' : String(credential.year),
    file: credential.file,
    filePublic: credential.filePublic,
    verifiedAt: credential.verifiedAt,
  }));
}

export function emptyCredentialRow(): CredentialRow {
  return {
    key: newRowKey(),
    id: undefined,
    kind: 'CERTIFICATE',
    title: '',
    issuer: '',
    year: '',
    file: null,
    filePublic: false,
    verifiedAt: null,
  };
}

export function toCredentialInputs(rows: readonly CredentialRow[]): CoachCredentialInput[] | null {
  const credentials = rows.map((row): CoachCredentialInput => ({
    ...(row.id === undefined ? {} : { id: row.id }),
    kind: row.kind,
    title: row.title.trim(),
    issuer: textOrNull(row.issuer),
    year: parseInteger(row.year),
    file: row.file,
    // Галочка без скана ничего не значит — не отправляем её.
    filePublic: row.file !== null && row.filePublic,
  }));

  return setCoachCredentialsSchema.safeParse({ credentials }).success ? credentials : null;
}

// ---------------------------------------------------------------- заслуги

export interface AchievementRow {
  readonly key: string;
  readonly role: AchievementRole;
  readonly year: string;
  readonly title: string;
}

export function achievementRowsOf(coach: CoachView): AchievementRow[] {
  return coach.achievements.map((achievement) => ({
    key: newRowKey(),
    role: achievement.role,
    year: achievement.year === null ? '' : String(achievement.year),
    title: achievement.title,
  }));
}

export function emptyAchievementRow(role: AchievementRole = 'AS_PLAYER'): AchievementRow {
  return { key: newRowKey(), role, year: '', title: '' };
}

export function toAchievementInputs(
  rows: readonly AchievementRow[],
): CoachAchievementInput[] | null {
  const achievements = rows.map((row) => ({
    role: row.role,
    year: parseInteger(row.year),
    title: row.title.trim(),
  }));

  return setCoachAchievementsSchema.safeParse({ achievements }).success ? achievements : null;
}

/** Переставить строку на шаг вверх или вниз. */
export function moveRow<T>(rows: readonly T[], index: number, by: -1 | 1): T[] {
  const next = [...rows];
  const [row] = next.splice(index, 1);

  if (row === undefined) return next;

  next.splice(Math.max(0, Math.min(next.length, index + by)), 0, row);

  return next;
}
