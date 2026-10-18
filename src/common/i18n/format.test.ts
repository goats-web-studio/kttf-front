import { describe, expect, it } from 'vitest';

import { formatDelta, formatRating, formatTimeTick } from './format';

describe('formatRating', () => {
  it('два знака после точки — дописывает нули строкой (07, 10.2)', () => {
    expect(formatRating('421.22')).toBe('421.22');
    expect(formatRating('411.9')).toBe('411.90');
    expect(formatRating('250')).toBe('250.00');
  });

  it('лишних знаков не обрезает и неразбираемое не трогает', () => {
    // Округлять — значит менять рейтинг на экране, а он должен совпадать с журналом.
    expect(formatRating('421.225')).toBe('421.225');
    expect(formatRating('—')).toBe('—');
  });
});

describe('formatDelta', () => {
  it('знак обязателен, два знака после точки', () => {
    expect(formatDelta('3.5')).toBe('+3.50');
    expect(formatDelta('-7.94')).toBe('-7.94');
    expect(formatDelta('-7.9')).toBe('-7.90');
  });

  it('ноль — без знака', () => {
    expect(formatDelta('0')).toBe('0.00');
    expect(formatDelta('0.00')).toBe('0.00');
  });
});

describe('formatTimeTick', () => {
  const march = new Date(2026, 2, 5).getTime();

  it('год — числом, без «г.»: под осью он отдельной строкой', () => {
    expect(formatTimeTick(march, 'year', 'ru')).toBe('2026');
    expect(formatTimeTick(march, 'year', 'kk')).toBe('2026');
  });

  it('месяц и день — коротко, по языку интерфейса', () => {
    expect(formatTimeTick(march, 'month', 'ru')).toBe('март');
    expect(formatTimeTick(march, 'day', 'ru')).toBe('5 мар.');
  });
});
