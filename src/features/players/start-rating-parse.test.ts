import { describe, expect, it } from 'vitest';

import { parseStartRating } from './start-rating-parse';

describe('parseStartRating — стартовый рейтинг точным числом (ADR-085)', () => {
  it('целое, точка и запятая — до сотых', () => {
    expect(parseStartRating('410')).toBe(410);
    expect(parseStartRating('384.1')).toBe(384.1);
    expect(parseStartRating('384,15')).toBe(384.15);
    expect(parseStartRating(' 365.14 ')).toBe(365.14);
  });

  it('больше двух знаков после точки, не число и пусто — нет рейтинга', () => {
    expect(parseStartRating('384.155')).toBeNull();
    expect(parseStartRating('abc')).toBeNull();
    expect(parseStartRating('')).toBeNull();
    expect(parseStartRating('-5')).toBeNull();
  });

  it('за пределами 1–3000 — нет рейтинга', () => {
    expect(parseStartRating('0')).toBeNull();
    expect(parseStartRating('1')).toBe(1);
    expect(parseStartRating('3000')).toBe(3000);
    expect(parseStartRating('3000.01')).toBeNull();
  });
});
