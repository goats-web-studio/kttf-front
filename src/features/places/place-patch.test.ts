import { describe, expect, it } from 'vitest';

import { CITIES, COUNTRY, REGIONS } from '@/test/fixtures';

import { cityPatch, countryPatch, regionPatch } from './place-patch';

describe('правка справочника', () => {
  it('без изменений запроса нет: сервер отверг бы пустую правку', () => {
    expect(
      countryPatch(COUNTRY, {
        code: COUNTRY.code,
        name: COUNTRY.name,
        nameKk: 'Қазақстан',
        sortOrder: COUNTRY.sortOrder,
      }),
    ).toBeNull();
  });

  it('стёртое казахское название уходит null, а не пропадает из правки', () => {
    expect(
      cityPatch(CITIES.oskemen, { name: CITIES.oskemen.name, sortOrder: CITIES.oskemen.sortOrder }),
    ).toEqual({ nameKk: null });
  });

  it('пустой порядок не трогает заданный', () => {
    expect(cityPatch(CITIES.almaty, { name: 'Алма-Ата', nameKk: 'Алматы' })).toEqual({
      name: 'Алма-Ата',
    });
  });

  it('отправляет только изменённое', () => {
    expect(
      countryPatch(COUNTRY, { code: 'KZ', name: COUNTRY.name, nameKk: 'Қазақстан', sortOrder: 5 }),
    ).toEqual({ sortOrder: 5 });
  });

  it('пустая область выводит город из области — уходит null (ADR-096)', () => {
    expect(
      cityPatch(CITIES.oskemen, {
        name: CITIES.oskemen.name,
        nameKk: 'Өскемен',
        regionId: undefined,
      }),
    ).toEqual({ regionId: null });
  });

  it('город без поля области в форме область не трогает', () => {
    expect(cityPatch(CITIES.oskemen, { name: CITIES.oskemen.name, nameKk: 'Өскемен' })).toBeNull();
  });

  it('город переходит в область', () => {
    expect(
      cityPatch(CITIES.almaty, { name: 'Алматы', nameKk: 'Алматы', regionId: REGIONS.vko.id }),
    ).toEqual({ regionId: REGIONS.vko.id });
  });

  it('правка области — только изменённое, стёртое казахское название — null', () => {
    expect(
      regionPatch(REGIONS.vko, { name: REGIONS.vko.name, nameKk: REGIONS.vko.nameKk }),
    ).toBeNull();
    expect(regionPatch(REGIONS.vko, { name: 'ВКО', sortOrder: 3 })).toEqual({
      name: 'ВКО',
      nameKk: null,
      sortOrder: 3,
    });
  });
});
