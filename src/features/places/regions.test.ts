import { MAX_FILTER_CITIES } from '@kttf/shared/types';
import { describe, expect, it } from 'vitest';

import { CITIES, CITY_LIST, REGION_LIST, REGIONS } from '@/test/fixtures';

import { citiesByRegion, groupedByRegion, scopeCityIds, scopeOptions } from './regions';

const VKO = REGIONS.vko.id;

describe('города по областям — ADR-096', () => {
  it('сначала города вне областей, затем область со своими городами', () => {
    const groups = citiesByRegion(REGION_LIST, CITY_LIST);

    expect(groups.map((group) => group.region?.id)).toEqual([undefined, VKO]);
    expect(groups[0]?.cities.map((city) => city.id)).toEqual([CITIES.almaty.id, CITIES.astana.id]);
    expect(groups[1]?.cities.map((city) => city.id)).toEqual([CITIES.oskemen.id, CITIES.ridder.id]);
  });

  it('область без городов не показывается, город скрытой области не теряется', () => {
    const empty = { ...REGIONS.vko, id: '00000000-0000-4000-8000-0000000000d2' };

    expect(citiesByRegion([empty], [CITIES.almaty]).map((group) => group.region)).toEqual([
      undefined,
    ]);
    // Области нет в открытом списке — её города идут с городами вне областей.
    expect(citiesByRegion([], [CITIES.oskemen])[0]?.cities).toEqual([CITIES.oskemen]);
  });

  it('группа выпадающего списка — название области, у городов вне областей пусто', () => {
    const grouped = groupedByRegion(REGION_LIST, CITY_LIST, (region) => region.name);

    expect(grouped.groupOf(CITIES.almaty)).toBe('');
    expect(grouped.groupOf(CITIES.ridder)).toBe(REGIONS.vko.name);
  });

  it('пункты фильтра: область строкой над своими городами, её города — с отступом', () => {
    expect(
      scopeOptions(REGION_LIST, CITY_LIST).map((option) => [option.id, option.kind, option.nested]),
    ).toEqual([
      [CITIES.almaty.id, 'city', false],
      [CITIES.astana.id, 'city', false],
      [VKO, 'region', false],
      [CITIES.oskemen.id, 'city', true],
      [CITIES.ridder.id, 'city', true],
    ]);
  });
});

describe('выбор фильтра → города запроса', () => {
  it('область раскрывается в свои города, город остаётся собой', () => {
    expect(scopeCityIds([VKO, CITIES.astana.id], CITY_LIST)).toEqual([
      CITIES.oskemen.id,
      CITIES.ridder.id,
      CITIES.astana.id,
    ]);
  });

  it('город, выбранный и сам, и через область, — один раз', () => {
    expect(scopeCityIds([CITIES.ridder.id, VKO], CITY_LIST)).toEqual([
      CITIES.ridder.id,
      CITIES.oskemen.id,
    ]);
  });

  it('скрытый город из ссылки фильтрует по-прежнему, а не снимает фильтр', () => {
    const hidden = '00000000-0000-4000-8000-0000000000c9';

    expect(scopeCityIds([hidden], CITY_LIST)).toEqual([hidden]);
  });

  it('без справочника — выбор как есть', () => {
    expect(scopeCityIds([VKO, VKO], undefined)).toEqual([VKO]);
  });

  it('не больше потолка фильтра', () => {
    const many = Array.from({ length: MAX_FILTER_CITIES + 5 }, (_, index) => ({
      ...CITIES.oskemen,
      id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    }));

    expect(scopeCityIds([VKO], many)).toHaveLength(MAX_FILTER_CITIES);
  });
});
