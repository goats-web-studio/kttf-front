import { describe, expect, it } from 'vitest';

import { CLUB } from '@/test/fixtures';

import { clubPatch } from './club-patch';

describe('правка клуба', () => {
  it('отправляет только изменённое', () => {
    expect(
      clubPatch(CLUB, { name: CLUB.name, city: CLUB.city, tableCount: 10, phone: '+77011234567' }),
    ).toEqual({ tableCount: 10, phone: '+77011234567' });
  });

  it('стёртое в форме поле уходит null, а не пропадает из правки', () => {
    const club = { ...CLUB, phone: '+77011234567', description: 'Зал на втором этаже' };

    expect(
      clubPatch(club, {
        name: club.name,
        city: club.city,
        tableCount: club.tableCount,
        description: club.description,
      }),
    ).toEqual({ phone: null });
  });

  it('без изменений запроса нет: сервер отверг бы пустую правку', () => {
    expect(clubPatch(CLUB, { name: CLUB.name, city: CLUB.city, tableCount: CLUB.tableCount })).toBe(
      null,
    );
  });
});
