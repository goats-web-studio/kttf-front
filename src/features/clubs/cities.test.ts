import { describe, expect, it } from 'vitest';

import { CITIES, CLUB, cityRef } from '@/test/fixtures';

import { clubCities } from './cities';

describe('города клубов', () => {
  const almaty = { ...CLUB, id: 'a' };
  const oskemen = { ...CLUB, id: 'b', city: cityRef(CITIES.oskemen) };

  it('город с несколькими клубами — один раз: сравнение по записи справочника', () => {
    expect(clubCities([almaty, { ...almaty, id: 'c' }], 'ru')).toEqual([cityRef(CITIES.almaty)]);
  });

  it('порядок — по названию на языке интерфейса', () => {
    expect(clubCities([oskemen, almaty], 'kk').map((city) => city.id)).toEqual([
      CITIES.almaty.id,
      CITIES.oskemen.id,
    ]);
  });
});
