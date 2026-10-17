import type { CityView, CountryView } from '@kttf/shared/types';
import { describe, expect, it } from 'vitest';

import { citiesByCountry, defaultCountry } from './countries';

function country(id: string, code: string): CountryView {
  return { id, code, name: code, nameKk: null, sortOrder: 0, isActive: true };
}

function city(id: string, countryId: string): CityView {
  return { id, countryId, name: id, nameKk: null, sortOrder: 0, isActive: true };
}

describe('страны справочника', () => {
  it('по умолчанию — Казахстан, где бы он ни стоял в списке', () => {
    expect(defaultCountry([country('ru', 'RU'), country('kz', 'KZ')])?.id).toBe('kz');
  });

  it('без Казахстана — первая страна по порядку', () => {
    expect(defaultCountry([country('ru', 'RU'), country('uz', 'UZ')])?.id).toBe('ru');
  });

  it('города делятся по странам, пустая страна группы не даёт', () => {
    const groups = citiesByCountry(
      [country('kz', 'KZ'), country('ru', 'RU'), country('uz', 'UZ')],
      [city('almaty', 'kz'), city('moscow', 'ru'), city('astana', 'kz')],
    );

    expect(groups.map((group) => group.country?.id)).toEqual(['kz', 'ru']);
    expect(groups[0]?.cities.map((item) => item.id)).toEqual(['almaty', 'astana']);
  });

  it('город неизвестной страны не теряется', () => {
    const groups = citiesByCountry([country('kz', 'KZ')], [city('tashkent', 'uz')]);

    expect(groups).toEqual([{ country: undefined, cities: [city('tashkent', 'uz')] }]);
  });
});
