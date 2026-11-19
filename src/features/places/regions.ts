import {
  citiesInScope,
  MAX_FILTER_CITIES,
  type CityView,
  type RegionView,
} from '@kttf/shared/types';

import type { Named } from './place-name';

/** Город с областью — запись справочника или её часть. */
type RegionalCity = Named & { readonly id: string; readonly regionId: string | null };

/** Группа выбора: область и её города; `region: undefined` — города вне областей. */
export interface RegionGroup<C> {
  readonly region: RegionView | undefined;
  readonly cities: readonly C[];
}

/**
 * Города по областям — ADR-096.
 *
 * Сначала города вне областей — Астана, Алматы, Шымкент, — затем области
 * в порядке справочника, каждая со своими городами. Область без городов
 * не показывается: выбрать в ней нечего. Город скрытой области не теряется —
 * он идёт с городами вне областей.
 */
export function citiesByRegion<C extends Pick<CityView, 'regionId'>>(
  regions: readonly RegionView[],
  cities: readonly C[],
): readonly RegionGroup<C>[] {
  const known = new Set(regions.map((region) => region.id));
  const loose = cities.filter((city) => city.regionId === null || !known.has(city.regionId));
  const groups = regions
    .map((region) => ({
      region,
      cities: cities.filter((city) => city.regionId === region.id),
    }))
    .filter((group) => group.cities.length > 0);

  return loose.length === 0 ? groups : [{ region: undefined, cities: loose }, ...groups];
}

/**
 * Города для выпадающего списка с группами по областям — ADR-096.
 *
 * `cities` — в порядке групп: подзаголовок MUI ставится над соседними
 * пунктами с одной группой. `groupOf` — название области города; `''` —
 * город вне областей, он идёт первым и без подзаголовка.
 */
export function groupedByRegion<C extends Pick<CityView, 'id' | 'regionId'>>(
  regions: readonly RegionView[],
  cities: readonly C[],
  label: (region: RegionView) => string,
): { readonly cities: C[]; readonly groupOf: (city: { readonly id: string }) => string } {
  const groups = citiesByRegion(regions, cities);
  const regionOf = new Map<string, string>();
  for (const group of groups) {
    if (group.region === undefined) continue;
    const name = label(group.region);
    for (const city of group.cities) regionOf.set(city.id, name);
  }

  return {
    cities: groups.flatMap((group) => group.cities),
    groupOf: (city) => regionOf.get(city.id) ?? '',
  };
}

/** Пункт фильтра: город или область целиком. */
export interface ScopeOption extends Named {
  readonly id: string;
  readonly kind: 'city' | 'region';
  /** Город области — под её строкой, с отступом. */
  readonly nested: boolean;
}

/**
 * Пункты фильтра «Город» — ADR-096: города вне областей, затем каждая
 * область строкой «вся область» и под ней её города.
 */
export function scopeOptions(
  regions: readonly RegionView[],
  cities: readonly RegionalCity[],
): ScopeOption[] {
  return citiesByRegion(regions, cities).flatMap((group) => {
    const nested = group.region !== undefined;
    const cityOptions = group.cities.map((city): ScopeOption => ({
      id: city.id,
      name: city.name,
      nameKk: city.nameKk,
      kind: 'city',
      nested,
    }));

    return group.region === undefined
      ? cityOptions
      : [
          {
            id: group.region.id,
            name: group.region.name,
            nameKk: group.region.nameKk,
            kind: 'region' as const,
            nested: false,
          },
          ...cityOptions,
        ];
  });
}

/**
 * Выбор фильтра → города запроса — ADR-096.
 *
 * Область раскрывается в свои города (`citiesInScope`), город остаётся
 * собой. Идентификатор, который раскрыть не во что, уходит как есть: скрытый
 * город из ссылки фильтрует по-прежнему (ADR-046), а область без городов
 * даёт пустой список, а не «все города». Без справочника — выбор как есть.
 */
export function scopeCityIds(
  selected: readonly string[],
  cities: readonly Pick<CityView, 'id' | 'regionId'>[] | undefined,
): string[] {
  if (cities === undefined) return [...new Set(selected)];

  const result = new Set<string>();
  for (const id of selected) {
    const inScope = citiesInScope([id], cities);
    for (const cityId of inScope.length === 0 ? [id] : inScope) result.add(cityId);
  }

  return [...result].slice(0, MAX_FILTER_CITIES);
}
