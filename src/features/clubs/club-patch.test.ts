import { describe, expect, it } from 'vitest';

import { CITIES, CLUB } from '@/test/fixtures';

import { clubPatch } from './club-patch';

describe('правка клуба', () => {
  it('отправляет только изменённое', () => {
    expect(
      clubPatch(CLUB, {
        name: CLUB.name,
        cityId: CLUB.city.id,
        tableCount: 10,
        phone: '+77011234567',
      }),
    ).toEqual({ tableCount: 10, phone: '+77011234567' });
  });

  it('стёртое в форме поле уходит null, а не пропадает из правки', () => {
    const club = { ...CLUB, phone: '+77011234567', description: 'Зал на втором этаже' };

    expect(
      clubPatch(club, {
        name: club.name,
        cityId: club.city.id,
        tableCount: club.tableCount,
        description: club.description,
      }),
    ).toEqual({ phone: null });
  });

  it('другой город уходит идентификатором из справочника', () => {
    expect(
      clubPatch(CLUB, { name: CLUB.name, cityId: CITIES.astana.id, tableCount: CLUB.tableCount }),
    ).toEqual({ cityId: CITIES.astana.id });
  });

  it('без изменений запроса нет: сервер отверг бы пустую правку', () => {
    expect(
      clubPatch(CLUB, { name: CLUB.name, cityId: CLUB.city.id, tableCount: CLUB.tableCount }),
    ).toBe(null);
  });
});
