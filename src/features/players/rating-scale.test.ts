import type { RatingPointView } from '@kttf/shared/types';
import { describe, expect, it } from 'vitest';

import {
  buildRatingScale,
  CHART_PAD,
  nearestPoint,
  niceStep,
  timeTicks,
  valueAxis,
} from './rating-scale';

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

  it('одна точка ставится по центру и ни ломаной, ни заливки не даёт', () => {
    const scale = buildRatingScale([point('2026-01-01T00:00:00.000Z', '300.00')], {
      width: 640,
      height: 240,
    });
    const center = CHART_PAD.left + (640 - CHART_PAD.right - CHART_PAD.left) / 2;

    expect(scale?.points).toHaveLength(1);
    expect(scale?.points[0]?.x).toBe(center);
    expect(scale?.line).toBe('');
    expect(scale?.area).toBe('');
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

  it('рейтинг точки — строкой из данных, а не числом', () => {
    const scale = buildRatingScale([
      point('2026-01-01T00:00:00.000Z', '250.50'),
      point('2026-02-01T00:00:00.000Z', '300.10'),
    ]);

    // Не «250.5» и не «300.1»: сотая доля обязана дожить до подсказки (ADR-014).
    expect(scale?.points.map((value) => value.rating)).toEqual(['250.50', '300.10']);
  });

  it('кривая лежит внутри сетки: крайние деления охватывают все точки', () => {
    const scale = buildRatingScale([
      point('2026-01-01T00:00:00.000Z', '403.40'),
      point('2026-02-01T00:00:00.000Z', '455.10'),
    ]);
    const ys = scale?.valueTicks.map((tick) => tick.y) ?? [];

    for (const value of scale?.points ?? []) {
      expect(value.y).toBeGreaterThanOrEqual(Math.min(...ys));
      expect(value.y).toBeLessThanOrEqual(Math.max(...ys));
    }
  });

  it('заливка замыкается на нижней линии области', () => {
    const scale = buildRatingScale(
      [point('2026-01-01T00:00:00.000Z', '250.00'), point('2026-02-01T00:00:00.000Z', '300.00')],
      { width: 400, height: 200 },
    );
    const bottom = String(200 - CHART_PAD.bottom);

    expect(scale?.area.startsWith(`M${String(CHART_PAD.left)},${bottom} L`)).toBe(true);
    expect(scale?.area.endsWith(`,${bottom} Z`)).toBe(true);
    expect(scale?.area).not.toContain('NaN');
  });

  it('холст — в пикселях места: ширина меняет координаты, а не кегль', () => {
    const points = [
      point('2026-01-01T00:00:00.000Z', '250.00'),
      point('2026-02-01T00:00:00.000Z', '300.00'),
    ];
    const narrow = buildRatingScale(points, { width: 360, height: 200 });
    const wide = buildRatingScale(points, { width: 1200, height: 200 });

    expect(narrow?.points.at(-1)?.x).toBe(360 - CHART_PAD.right);
    expect(wide?.points.at(-1)?.x).toBe(1200 - CHART_PAD.right);
    // На узком месте подписей дат меньше: иначе они налезут друг на друга.
    expect(narrow?.timeTicks.length ?? 0).toBeLessThanOrEqual(wide?.timeTicks.length ?? 0);
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

describe('ось значений', () => {
  it('шаг — 1, 2 или 5 на степень десяти, не меньше единицы', () => {
    expect(niceStep(54.6, 4)).toBe(20);
    expect(niceStep(400, 4)).toBe(100);
    expect(niceStep(7, 4)).toBe(2);
    expect(niceStep(0.8, 4)).toBe(1);
    expect(niceStep(0, 4)).toBe(1);
  });

  it('границы округляются наружу, деления — круглые', () => {
    expect(valueAxis(403.4, 455.1)).toEqual({ low: 400, high: 460, ticks: [400, 420, 440, 460] });
  });

  it('ровная кривая всё равно получает размах', () => {
    const axis = valueAxis(420, 420);

    expect(axis.high).toBeGreaterThan(axis.low);
  });
});

describe('ось времени', () => {
  const at = (year: number, month: number, day = 1) => new Date(year, month, day).getTime();

  it('за полгода — месяцы, год подписан у первого деления', () => {
    const ticks = timeTicks(at(2026, 2, 15), at(2026, 7, 20), 6);

    expect(ticks.map((tick) => tick.unit)).toEqual(['month', 'month', 'month', 'month', 'month']);
    expect(ticks[0]?.time).toBe(at(2026, 3));
    expect(ticks.map((tick) => tick.showYear)).toEqual([true, false, false, false, false]);
  });

  it('смена года подписывается заново', () => {
    const ticks = timeTicks(at(2025, 9, 10), at(2026, 2, 10), 6);
    const january = ticks.find((tick) => tick.time === at(2026, 0));

    expect(january?.showYear).toBe(true);
  });

  it('шаг крупнеет, пока подписи не поместятся, и кратен шагу от января', () => {
    const ticks = timeTicks(at(2024, 0, 10), at(2026, 9, 10), 4);

    expect(ticks.length).toBeLessThanOrEqual(4);
    expect(
      ticks.every((tick) => tick.unit === 'year' || new Date(tick.time).getMonth() % 6 === 0),
    ).toBe(true);
  });

  it('турниры одного дня — одно деление на них', () => {
    const ticks = timeTicks(at(2026, 4, 5) + 3_600_000, at(2026, 4, 5) + 7_200_000, 6);

    expect(ticks).toEqual([{ time: at(2026, 4, 5) + 3_600_000, unit: 'day', showYear: true }]);
  });

  it('несколько недель — дни', () => {
    const ticks = timeTicks(at(2026, 4, 1), at(2026, 4, 20), 6);

    expect(ticks[0]?.unit).toBe('day');
    expect(ticks.length).toBeLessThanOrEqual(6);
  });
});

describe('ближайшая точка', () => {
  const scale = buildRatingScale(
    [
      point('2026-01-01T00:00:00.000Z', '250.00', 'a'),
      point('2026-02-01T00:00:00.000Z', '300.00', 'b'),
      point('2026-04-01T00:00:00.000Z', '280.00', 'c'),
    ],
    { width: 640, height: 240 },
  );
  const points = scale?.points ?? [];

  it('по горизонтали: попадать в линию не нужно', () => {
    expect(nearestPoint(points, 0)).toBe(0);
    expect(nearestPoint(points, (points[1]?.x ?? 0) + 3)).toBe(1);
    expect(nearestPoint(points, 10_000)).toBe(2);
  });

  it('без точек — ничего', () => {
    expect(nearestPoint([], 100)).toBe(-1);
  });
});
