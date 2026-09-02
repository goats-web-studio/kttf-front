import type { RatingPointView } from '@kttf/shared/types';
import { describe, expect, it } from 'vitest';

import { buildRatingScale } from './rating-scale';

/**
 * Геометрия кривой рейтинга.
 *
 * Проверяется то, что ломает график молча: деление на нулевой размах,
 * одиночная точка и неразбираемое значение. SVG с `NaN` в координате не
 * рисует ничего вовсе — на экране это выглядит как пустое место, а не как
 * ошибка, и заметить такое без теста нельзя.
 */

function point(
  playedAt: string,
  ratingAfter: string,
  tournamentId = 'tournament',
): RatingPointView {
  return {
    tournamentId,
    tournamentName: 'Турнир',
    playedAt,
    ratingBefore: '0.00',
    ratingAfter,
    delta: '0.00',
    matches: 1,
  };
}

describe('buildRatingScale', () => {
  it('пустая история не даёт холста', () => {
    expect(buildRatingScale([])).toBeNull();
  });

  it('раскладывает точки слева направо по времени', () => {
    const scale = buildRatingScale([
      point('2026-01-01T00:00:00.000Z', '250.00'),
      point('2026-02-01T00:00:00.000Z', '300.00'),
      point('2026-04-01T00:00:00.000Z', '280.00'),
    ]);

    const xs = scale?.points.map((value) => value.x) ?? [];

    expect(xs).toHaveLength(3);
    expect(xs[0]).toBeLessThan(xs[1] ?? 0);
    expect(xs[1]).toBeLessThan(xs[2] ?? 0);
  });

  it('перерыв в календаре виден: точки не раскладываются поровну', () => {
    // Между первой и второй месяц, между второй и третьей — два.
    const scale = buildRatingScale([
      point('2026-01-01T00:00:00.000Z', '250.00'),
      point('2026-02-01T00:00:00.000Z', '300.00'),
      point('2026-04-01T00:00:00.000Z', '280.00'),
    ]);

    const [first, second, third] = scale?.points ?? [];
    const left = (second?.x ?? 0) - (first?.x ?? 0);
    const right = (third?.x ?? 0) - (second?.x ?? 0);

    expect(right).toBeGreaterThan(left);
  });

  it('высокий рейтинг лежит выше низкого', () => {
    const scale = buildRatingScale([
      point('2026-01-01T00:00:00.000Z', '250.00'),
      point('2026-02-01T00:00:00.000Z', '300.00'),
    ]);

    const [low, high] = scale?.points ?? [];

    // Ось Y в SVG растёт вниз: у большего рейтинга координата меньше.
    expect(high?.y).toBeLessThan(low?.y ?? 0);
  });

  it('ровная кривая рисуется, а не обращается в NaN', () => {
    const scale = buildRatingScale([
      point('2026-01-01T00:00:00.000Z', '300.00'),
      point('2026-02-01T00:00:00.000Z', '300.00'),
    ]);

    for (const value of scale?.points ?? []) {
      expect(Number.isFinite(value.y)).toBe(true);
    }

    expect(scale?.line).not.toContain('NaN');
  });

  it('одна точка ставится по центру и ломаной не даёт', () => {
    const scale = buildRatingScale([point('2026-01-01T00:00:00.000Z', '300.00')]);

    expect(scale?.points).toHaveLength(1);
    expect(scale?.points[0]?.x).toBe(320);
    expect(scale?.line).toBe('');
  });

  it('турниры одного дня раскладываются поровну', () => {
    const scale = buildRatingScale([
      point('2026-01-01T09:00:00.000Z', '250.00'),
      point('2026-01-01T09:00:00.000Z', '260.00'),
    ]);

    const [first, second] = scale?.points ?? [];

    expect(first?.x).not.toBe(second?.x);
    expect(Number.isFinite(second?.x ?? Number.NaN)).toBe(true);
  });

  it('границы масштаба показываются строками из данных, а не числами', () => {
    const scale = buildRatingScale([
      point('2026-01-01T00:00:00.000Z', '250.50'),
      point('2026-02-01T00:00:00.000Z', '300.10'),
    ]);

    // Не «250.5» и не «300.1»: сотая доля обязана дожить до экрана (ADR-014).
    expect(scale?.lowest).toBe('250.50');
    expect(scale?.highest).toBe('300.10');
  });

  it('испорченное значение выбрасывается, остальная кривая остаётся', () => {
    const scale = buildRatingScale([
      point('2026-01-01T00:00:00.000Z', '250.00'),
      point('2026-02-01T00:00:00.000Z', 'не число'),
      point('2026-03-01T00:00:00.000Z', '300.00'),
    ]);

    expect(scale?.points).toHaveLength(2);
    expect(scale?.line).not.toContain('NaN');
  });

  it('ручная корректировка получает свой ключ, а не пустой', () => {
    const adjustment: RatingPointView = {
      ...point('2026-01-01T00:00:00.000Z', '250.00'),
      tournamentId: null,
      tournamentName: null,
    };

    expect(buildRatingScale([adjustment])?.points[0]?.key).toBe('adjustment-0');
  });
});
