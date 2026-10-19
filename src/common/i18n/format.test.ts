import { describe, expect, it } from 'vitest';

import { formatDelta, formatRating, formatTimeTick } from './format';

describe('formatRating', () => {
  it('целым, до ближайшего (ADR-053)', () => {
    expect(formatRating('384.10')).toBe('384');
    expect(formatRating('396.78')).toBe('397');
    expect(formatRating('411.9')).toBe('412');
    expect(formatRating('250')).toBe('250');
    expect(formatRating('399.99')).toBe('400');
  });

  it('половина — вверх, по первой цифре дробной части', () => {
    expect(formatRating('421.50')).toBe('422');
    expect(formatRating('421.49')).toBe('421');
    expect(formatRating('421.499')).toBe('421');
  });

  it('неразбираемое не трогает', () => {
    expect(formatRating('—')).toBe('—');
    expect(formatRating('')).toBe('');
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
