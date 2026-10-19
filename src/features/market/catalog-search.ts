import {
  PRODUCT_ATTRIBUTES,
  PRODUCT_OPTION_AXES,
  parseProductFilters,
  type AttributeDef,
  type OptionAxis,
  type ProductCategory,
  type ProductFilters,
} from '@kttf/shared/types';
import { z } from 'zod';

import { queryString } from '@/common/api';
import { searchPage, searchText } from '@/common/search';

/**
 * Фильтры каталога в адресе — `docs/10` 5.3, `docs/07` 6.2.
 *
 * Подборку пересылают ссылкой, поэтому всё состояние списка — в адресе:
 * поиск, производители, порядок, страница и условия по характеристикам.
 * Условия пишутся в том виде, в каком их разбирает сервер
 * (`parseProductFilters`): `?bladeType=OFF,ALL&weight=80-90&tensor=1`.
 *
 * Состав условий зависит от категории, поэтому адрес — плоский объект с
 * ключами характеристик рядом с `q`, `brand`, `sort` и `page`. Кривое условие
 * молча выпадает: ссылку могли собрать руками или по старым описаниям.
 */

/** Порядок «популярные» — умолчание и в адрес не пишется. */
export const CATALOG_SORTS = ['popular', 'name', 'new'] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

/**
 * Значение условия в адресе. Число — там, где строка читается числом:
 * роутер разбирает значения как JSON, и `?tensor=1` приходит числом, а
 * строка «1» ушла бы в адрес кавычками (`?tensor=%221%22`).
 */
export type FilterValue = string | number;

export type CatalogSearch = {
  readonly q?: string | undefined;
  /** Производители — идентификаторами через запятую. */
  readonly brand?: string | undefined;
  readonly sort?: Exclude<CatalogSort, 'popular'> | undefined;
  readonly page?: number | undefined;
} & Readonly<Record<string, FilterValue | undefined>>;

/** Ходовые толщины губки — выбор в фильтре. Остальные приходят ссылкой и тоже работают. */
export const THICKNESS_CHOICES: readonly string[] = [
  'OX',
  '1.5',
  '1.7',
  '1.8',
  '1.9',
  '2.0',
  '2.1',
  '2.2',
  'max',
];

/** Ключи адреса, которые не являются условиями по характеристикам. */
const BASE_KEYS = new Set(['q', 'brand', 'sort', 'page']);

const brandList = z
  .preprocess(
    (value) =>
      typeof value === 'string'
        ? value
            .split(',')
            .map((part) => part.trim())
            .filter((part) => z.uuid().safeParse(part).success)
            .slice(0, 20)
            .join(',')
        : value,
    z.string().min(1),
  )
  .optional()
  .catch(undefined);

const baseSchema = z.object({
  q: searchText,
  brand: brandList,
  sort: z.enum(['name', 'new']).optional().catch(undefined),
  page: searchPage,
});

/** Условия, которые бывают у категории: характеристики с `filter` и оси вариантов. */
export function filterDefs(category: ProductCategory): readonly AttributeDef[] {
  return PRODUCT_ATTRIBUTES[category].filter((def) => def.filter);
}

export function optionAxes(category: ProductCategory): readonly OptionAxis[] {
  return PRODUCT_OPTION_AXES[category];
}

/**
 * Число, прочитанное роутером из адреса, — снова строкой. Толщина губки —
 * с десятыми: `?thickness=2.0` роутер читает числом 2, а «2» толщиной не
 * является.
 */
function rawString(key: string, value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return key === 'thickness' && Number.isInteger(value) ? value.toFixed(1) : String(value);
  }

  return undefined;
}

/** Строка условия — в значение адреса, которое роутер прочтёт обратно той же строкой. */
export function toFilterValue(raw: string): FilterValue {
  const number = Number(raw);

  return raw.trim() !== '' && Number.isFinite(number) && String(number) === raw ? number : raw;
}

/** Строка условия из адреса — в том виде, в каком её ждёт сервер. */
export function filterString(search: CatalogSearch, key: string): string | undefined {
  return rawString(key, search[key]);
}

/** Разобранные условия обратно строками адреса — в каноническом виде. */
function serializeFilters(filters: ProductFilters): Record<string, FilterValue> {
  const out: Record<string, FilterValue> = {};

  for (const filter of filters.attrs) {
    if (filter.kind === 'in') {
      out[filter.key] = toFilterValue(filter.values.join(','));
    } else if (filter.kind === 'range') {
      out[filter.key] = toFilterValue(
        `${filter.min === undefined ? '' : String(filter.min)}-${filter.max === undefined ? '' : String(filter.max)}`,
      );
    } else {
      out[filter.key] = filter.value ? 1 : 0;
    }
  }
  for (const option of filters.options) {
    out[option.axis] = toFilterValue(option.values.join(','));
  }

  return out;
}

/** Условия по характеристикам из адреса — разбором общего кода. */
export function catalogFilters(category: ProductCategory, search: CatalogSearch): ProductFilters {
  const raw: Record<string, string> = {};

  for (const key of Object.keys(search)) {
    if (BASE_KEYS.has(key)) continue;
    const value = rawString(key, search[key]);
    if (value !== undefined) raw[key] = value;
  }

  return parseProductFilters(category, raw);
}

/**
 * Адрес списка. Без категории (главная маркета, страница производителя) —
 * только поиск, производители, порядок и страница.
 */
export function parseCatalogSearch(
  category: ProductCategory | null,
  search: Record<string, unknown>,
): CatalogSearch {
  const base = baseSchema.parse(search);
  const clean: Record<string, FilterValue | undefined> = {};

  for (const [key, value] of Object.entries(base)) {
    if (value !== undefined) clean[key] = value;
  }
  if (category === null) return clean;

  const raw: Record<string, string> = {};
  for (const [key, value] of Object.entries(search)) {
    if (BASE_KEYS.has(key)) continue;
    const text = rawString(key, value);
    if (text !== undefined) raw[key] = text;
  }

  return { ...clean, ...serializeFilters(parseProductFilters(category, raw)) };
}

/**
 * Адрес до того, как известна категория: `validateSearch` маршрута не видит
 * параметров пути. Общие поля проверяются сразу, условия по характеристикам
 * пропускаются строками и числами — их разбирает `parseCatalogSearch`, когда
 * категория уже есть.
 */
export function parseLooseCatalogSearch(search: Record<string, unknown>): CatalogSearch {
  const clean: Record<string, FilterValue | undefined> = { ...parseCatalogSearch(null, search) };

  for (const [key, value] of Object.entries(search)) {
    if (BASE_KEYS.has(key)) continue;
    if (typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))) {
      clean[key] = value;
    }
  }

  return clean;
}

export function brandsOf(search: CatalogSearch): readonly string[] {
  return search.brand === undefined ? [] : search.brand.split(',');
}

/** Сколько условий задано помимо названия — число на кнопке «Фильтры (N)». */
export function activeFilterCount(category: ProductCategory, search: CatalogSearch): number {
  const filters = catalogFilters(category, search);

  return (search.brand === undefined ? 0 : 1) + filters.attrs.length + filters.options.length;
}

/** Строка запроса к `GET /catalog/products`. */
export function catalogApiQuery(
  category: ProductCategory | undefined,
  search: CatalogSearch,
  limit: number,
  extra: Readonly<Record<string, string>> = {},
): string {
  const filters: Record<string, string> = {};

  if (category !== undefined) {
    for (const [key, value] of Object.entries(serializeFilters(catalogFilters(category, search)))) {
      filters[key] = String(value);
    }
  }

  return queryString({
    category,
    brandId: search.brand,
    search: search.q,
    ...(search.sort === undefined ? {} : { sort: search.sort }),
    page: search.page ?? 1,
    limit,
    ...extra,
    ...filters,
  });
}

// ---------- черновик панели фильтров ----------

export interface RangeDraft {
  readonly from: string;
  readonly to: string;
}

/**
 * Набранные в панели условия до «Найти». Списки — и у перечислений, и у осей
 * вариантов: ключи характеристик и осей не пересекаются.
 */
export interface CatalogDraft {
  readonly q: string;
  readonly brands: readonly string[];
  readonly lists: Readonly<Record<string, readonly string[]>>;
  readonly ranges: Readonly<Record<string, RangeDraft>>;
  readonly flags: Readonly<Record<string, boolean>>;
}

export function draftFromSearch(category: ProductCategory, search: CatalogSearch): CatalogDraft {
  const filters = catalogFilters(category, search);
  const lists: Record<string, readonly string[]> = {};
  const ranges: Record<string, RangeDraft> = {};
  const flags: Record<string, boolean> = {};

  for (const filter of filters.attrs) {
    if (filter.kind === 'in') lists[filter.key] = filter.values;
    else if (filter.kind === 'range') {
      ranges[filter.key] = {
        from: filter.min === undefined ? '' : String(filter.min),
        to: filter.max === undefined ? '' : String(filter.max),
      };
    } else flags[filter.key] = filter.value;
  }
  for (const option of filters.options) lists[option.axis] = option.values;

  return { q: search.q ?? '', brands: brandsOf(search), lists, ranges, flags };
}

function bound(value: string): number | undefined {
  const trimmed = value.trim().replace(',', '.');
  if (trimmed === '') return undefined;
  const number = Number(trimmed);

  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

/**
 * Черновик — в адрес. Пустое не пишется; «от 90 до 80» — это «от 80 до 90».
 * Порядок остаётся, страница сбрасывается на первую.
 */
export function searchFromDraft(
  category: ProductCategory,
  draft: CatalogDraft,
  sort: CatalogSearch['sort'],
): CatalogSearch {
  const raw: Record<string, string> = {};

  for (const def of filterDefs(category)) {
    if (def.kind === 'enum' || def.kind === 'enums') {
      const values = draft.lists[def.key] ?? [];
      if (values.length > 0) raw[def.key] = values.join(',');
    } else if (def.kind === 'number' || def.kind === 'numbers') {
      const range = draft.ranges[def.key];
      if (range === undefined) continue;
      let low = bound(range.from);
      let high = bound(range.to);
      if (low !== undefined && high !== undefined && low > high) [low, high] = [high, low];
      if (low === undefined && high === undefined) continue;
      raw[def.key] =
        `${low === undefined ? '' : String(low)}-${high === undefined ? '' : String(high)}`;
    } else if (def.kind === 'bool') {
      if (draft.flags[def.key] === true) raw[def.key] = '1';
    }
  }
  for (const axis of optionAxes(category)) {
    const values = draft.lists[axis] ?? [];
    if (values.length > 0) raw[axis] = values.join(',');
  }

  const q = draft.q.trim();

  return parseCatalogSearch(category, {
    ...(q === '' ? {} : { q }),
    ...(draft.brands.length === 0 ? {} : { brand: draft.brands.join(',') }),
    ...(sort === undefined ? {} : { sort }),
    ...raw,
  });
}
