import { describe, expect, it } from 'vitest';

import { CITIES, COUNTRY } from '@/test/fixtures';

import { cityPatch, countryPatch } from './place-patch';

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
});
