import { describe, expect, it } from 'vitest';

import { CLUB } from '@/test/fixtures';

import { clubPatch } from './club-patch';

describe('правка клуба', () => {
  it('отправляет только изменённое', () => {
    expect(
      clubPatch(CLUB, { name: CLUB.name, city: CLUB.city, tableCount: 10, phone: '+77011234567' }),
    ).toEqual({ tableCount: 10, phone: '+77011234567' });
  });

  it('без изменений запроса нет: сервер отверг бы пустую правку', () => {
    expect(clubPatch(CLUB, { name: CLUB.name, city: CLUB.city, tableCount: CLUB.tableCount })).toBe(
      null,
    );
  });
});
