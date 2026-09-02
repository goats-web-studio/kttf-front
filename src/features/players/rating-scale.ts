import type { RatingPointView } from '@kttf/shared/types';

/**
 * Геометрия кривой рейтинга — ТЗ 9.3.
 *
 * Отдельно от компонента, потому что это арифметика, а не разметка: масштаб,
 * деление на ноль при плоской кривой и одиночная точка проверяются здесь без
 * DOM (бриф 3.2).
 *
 * **Числа разбираются только ради пиксельных координат.** Всё, что видит
 * человек, остаётся строкой ровно в том виде, в каком пришло от сервера:
 * рейтинг хранится как `Decimal(8,2)`, и двоичная плавающая точка держит не
 * всякое такое значение точно (ADR-014). Подписи осей поэтому берутся из
 * `ratingAfter` крайних точек, а не из вычисленных границ масштаба.
 */

/** Система координат холста. Ширина условная: SVG растягивается по месту. */
const VIEW_WIDTH = 640;
const VIEW_HEIGHT = 180;
const PAD_X = 6;
const PAD_Y = 10;

/**
 * Запас по вертикали, когда все значения равны.
 *
 * Без него размах равен нулю и координата обращается в `NaN`, а SVG с `NaN`
 * не рисует ничего — вместо ровной линии человек получил бы пустоту.
 */
const FLAT_PADDING = 5;

export interface RatingChartPoint {
  readonly key: string;
  readonly x: number;
  readonly y: number;
  /** Рейтинг после турнира, строкой как пришёл. */
  readonly rating: string;
  readonly playedAt: string;
  readonly tournamentId: string | null;
  readonly tournamentName: string | null;
}

export interface RatingScale {
  readonly width: number;
  readonly height: number;
  readonly points: readonly RatingChartPoint[];
  /** Точки для `polyline`. Пусто, когда точка одна: ломаной из неё не выйдет. */
  readonly line: string;
  /** Наименьший и наибольший рейтинг кривой — строками из данных. */
  readonly lowest: string;
  readonly highest: string;
  readonly from: string;
  readonly to: string;
}

interface Entry {
  readonly point: RatingPointView;
  readonly index: number;
  readonly value: number;
  readonly time: number;
}

/** Два знака: координата с шестнадцатью цифрами раздувает разметку без пользы. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Масштаб кривой по точкам истории.
 *
 * `null` означает «рисовать нечего»: у игрока нет ни одного обсчитанного
 * турнира. Пустой холст с осями сообщил бы человеку меньше, чем строка о том,
 * что история пуста.
 */
export function buildRatingScale(points: readonly RatingPointView[]): RatingScale | null {
  const entries: Entry[] = [];

  points.forEach((point, index) => {
    const value = Number(point.ratingAfter);
    const time = Date.parse(point.playedAt);

    // Неразбираемое значение — испорченные данные. Выкинутая точка хуже
    // целой кривой, но лучше, чем `NaN` в координате: с ним пропадает весь
    // график целиком, вместе с точками, которые в порядке.
    if (Number.isFinite(value) && Number.isFinite(time)) {
      entries.push({ point, index, value, time });
    }
  });

  const first = entries[0];
  const last = entries.at(-1);

  if (first === undefined || last === undefined) {
    return null;
  }

  const values = entries.map((entry) => entry.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const flat = min === max;
  const bottom = flat ? min - FLAT_PADDING : min;
  const top = flat ? max + FLAT_PADDING : max;

  const span = last.time - first.time;
  const innerWidth = VIEW_WIDTH - PAD_X * 2;
  const innerHeight = VIEW_HEIGHT - PAD_Y * 2;

  const chartPoints = entries.map((entry, position) => ({
    key: entry.point.tournamentId ?? `adjustment-${String(entry.index)}`,
    x: round(PAD_X + innerWidth * horizontal(entry, first, span, position, entries.length)),
    y: round(PAD_Y + innerHeight * ((top - entry.value) / (top - bottom))),
    rating: entry.point.ratingAfter,
    playedAt: entry.point.playedAt,
    tournamentId: entry.point.tournamentId,
    tournamentName: entry.point.tournamentName,
  }));

  return {
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT,
    points: chartPoints,
    line:
      chartPoints.length < 2
        ? ''
        : chartPoints.map((point) => `${String(point.x)},${String(point.y)}`).join(' '),
    lowest: pick(entries, min),
    highest: pick(entries, max),
    from: first.point.playedAt,
    to: last.point.playedAt,
  };
}

/**
 * Доля ширины, на которой стоит точка.
 *
 * Ось по времени, а не по номеру турнира: перерыв в полгода — часть динамики
 * игрока, и равномерная раскладка его бы скрыла. Когда времена совпали —
 * два турнира одного дня или единственная точка, — раскладка равномерная:
 * делить на нулевой размах нечем.
 */
function horizontal(
  entry: Entry,
  first: Entry,
  span: number,
  position: number,
  count: number,
): number {
  if (span > 0) {
    return (entry.time - first.time) / span;
  }

  return count < 2 ? 0.5 : position / (count - 1);
}

/** Строка рейтинга той точки, что дала границу масштаба. */
function pick(entries: readonly Entry[], value: number): string {
  return entries.find((entry) => entry.value === value)?.point.ratingAfter ?? '';
}
