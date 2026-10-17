import { describe, expect, it } from 'vitest';

import { placeName } from './place-name';

describe('название места', () => {
  const city = { name: 'Усть-Каменогорск', nameKk: 'Өскемен' };

  it('казахский интерфейс пишет казахское название', () => {
    expect(placeName(city, 'kk')).toBe('Өскемен');
  });

  it('без казахского названия казахский интерфейс пишет русское, а не пустоту', () => {
    expect(placeName({ name: 'Алматы', nameKk: null }, 'kk')).toBe('Алматы');
  });

  it('русский интерфейс пишет русское, даже если казахское есть', () => {
    expect(placeName(city, 'ru')).toBe('Усть-Каменогорск');
  });
});
