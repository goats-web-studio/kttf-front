import {
  COACH_LANGUAGES,
  DEFAULT_PAGE_SIZE,
  PRICE_KZT_MAX,
  TRAINING_AUDIENCES,
  TRAINING_KINDS,
  TRAINING_PLACES,
  type ListCoachesRequest,
  type ListTrainingsRequest,
  type TrainingAudience,
  type TrainingKind,
  type TrainingPlace,
} from '@kttf/shared/types';
import { z } from 'zod';

import { searchPage, searchText } from '@/common/search';

/**
 * Фильтры раздела «Тренировки» в адресе — `docs/11` 5.2, `docs/07` 6.2.
 *
 * Подборку «детская группа в Алматы до 20 000 ₸» пересылают ссылкой, поэтому
 * всё состояние — в адресе. Кривое значение выпадает, а не роняет страницу.
 *
 * Роутер разбирает значения адреса как JSON, а `RouterLink` при переходе
 * кладёт строку в кавычках: `?age=9` по ссылке приходит строкой «9», а
 * набранный руками — числом 9. Поэтому числа — через `z.coerce`, строки —
 * через `z.coerce.string()`.
 */

/** Вид страницы: тренировки — по умолчанию и в адрес не пишутся. */
export const TRAININGS_VIEWS = ['trainings', 'coaches'] as const;
export type TrainingsView = (typeof TRAININGS_VIEWS)[number];

/** Список через запятую: кривой элемент выпадает один, остальные остаются. */
function commaList(valid: (part: string) => boolean) {
  return z.coerce
    .string()
    .transform((value) =>
      value
        .split(',')
        .map((part) => part.trim())
        .filter(valid)
        .filter((part, index, all) => all.indexOf(part) === index)
        .join(','),
    )
    .pipe(z.string().min(1))
    .optional()
    .catch(undefined);
}

const oneOf =
  <T extends string>(values: readonly T[]) =>
  (part: string): part is T =>
    (values as readonly string[]).includes(part);

const isKind = oneOf(TRAINING_KINDS);
const isAudience = oneOf(TRAINING_AUDIENCES);
const isPlace = oneOf(TRAINING_PLACES);
const isUuid = (part: string): boolean => z.uuid().safeParse(part).success;

export const trainingsSearchSchema = z.object({
  view: z.coerce.string().pipe(z.literal('coaches')).optional().catch(undefined),
  kind: commaList(isKind),
  audience: commaList(isAudience),
  /** Возраст ребёнка: от трёх до семнадцати, как в контракте. */
  age: z.coerce.number().int().min(3).max(17).optional().catch(undefined),
  place: commaList(isPlace),
  /** Конкретный клуб KTTF — «где» сужено до одного зала. */
  clubId: z.coerce.string().pipe(z.uuid()).optional().catch(undefined),
  /** Города справочника — идентификаторами, через запятую (ADR-046). */
  city: commaList(isUuid),
  priceTo: z.coerce.number().int().min(0).max(PRICE_KZT_MAX).optional().catch(undefined),
  language: z.coerce.string().pipe(z.enum(COACH_LANGUAGES)).optional().catch(undefined),
  /** Поиск тренера по имени — только у вида «Тренеры». */
  q: searchText,
  page: searchPage,
});

export type TrainingsSearch = z.infer<typeof trainingsSearchSchema>;

export function listOf(value: string | undefined): string[] {
  return value === undefined ? [] : value.split(',');
}

export const kindsOf = (search: TrainingsSearch): TrainingKind[] =>
  listOf(search.kind).filter(isKind);
export const audiencesOf = (search: TrainingsSearch): TrainingAudience[] =>
  listOf(search.audience).filter(isAudience);
export const placesOf = (search: TrainingsSearch): TrainingPlace[] =>
  listOf(search.place).filter(isPlace);

/** Список в значение адреса: пустой — отсутствие поля. */
export function joinList(values: readonly string[]): string | undefined {
  return values.length === 0 ? undefined : values.join(',');
}

/** Переключить значение в списке: было — убрать, не было — добавить. */
export function toggleIn<T extends string>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

/** Тело запроса `GET /trainings` из адреса. */
export function toTrainingsQuery(search: TrainingsSearch, page: number): ListTrainingsRequest {
  const kind = kindsOf(search);
  const audience = audiencesOf(search);
  const place = placesOf(search);
  const city = listOf(search.city);

  return {
    page,
    limit: DEFAULT_PAGE_SIZE,
    ...(kind.length === 0 ? {} : { kind }),
    ...(audience.length === 0 ? {} : { audience }),
    ...(search.age === undefined ? {} : { age: search.age }),
    ...(place.length === 0 ? {} : { place }),
    ...(search.clubId === undefined ? {} : { clubId: search.clubId }),
    ...(city.length === 0 ? {} : { cityId: city }),
    ...(search.priceTo === undefined ? {} : { priceTo: search.priceTo }),
    ...(search.language === undefined ? {} : { language: search.language }),
  };
}

/** Тело запроса `GET /coaches`: у тренеров фильтры — город, язык и имя. */
export function toCoachesQuery(search: TrainingsSearch, page: number): ListCoachesRequest {
  const city = listOf(search.city);

  return {
    page,
    limit: DEFAULT_PAGE_SIZE,
    ...(city.length === 0 ? {} : { cityId: city }),
    ...(search.language === undefined ? {} : { language: search.language }),
    ...(search.q === undefined ? {} : { search: search.q }),
  };
}

/**
 * Сколько условий спрятано за кнопкой «Фильтры (N)» на телефоне. Каждый
 * выбранный вид, аудитория, место и город — по одному, как чипы под панелью.
 */
export function hiddenFilterCount(search: TrainingsSearch, view: TrainingsView): number {
  const shared = listOf(search.city).length + (search.language === undefined ? 0 : 1);

  if (view === 'coaches') return shared;

  return (
    shared +
    kindsOf(search).length +
    audiencesOf(search).length +
    placesOf(search).length +
    (search.clubId === undefined ? 0 : 1) +
    (search.age === undefined ? 0 : 1) +
    (search.priceTo === undefined ? 0 : 1)
  );
}

/** Есть ли что сбрасывать: от этого зависит «ничего не найдено» против «пусто». */
export function hasFilters(search: TrainingsSearch, view: TrainingsView): boolean {
  return hiddenFilterCount(search, view) > 0 || (view === 'coaches' && search.q !== undefined);
}
