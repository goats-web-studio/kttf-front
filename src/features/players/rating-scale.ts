import type { RatingPointView } from '@kttf/shared/types';

import type { TimeTickUnit } from '@/common/i18n';

/**
 * Геометрия кривой рейтинга — ТЗ 9.3, ADR-050.
 *
 * Отдельно от компонента, потому что это арифметика, а не разметка: масштаб,
 * деления осей, деление на ноль при плоской кривой и одиночная точка
 * проверяются здесь без DOM (бриф 3.2).
 *
 * Холст — в пикселях места, а не в условных единицах: ширину меряет
 * компонент. Иначе вместе с SVG растягивались бы подписи осей и точки — на
 * широком экране точка становилась пятном, на телефоне пропадала.
 *
 * **Числа разбираются только ради координат.** Рейтинг, который видит
 * человек, — строка ровно в том виде, в каком пришла от сервера: он хранится
 * как `Decimal(8,2)`, и двоичная плавающая точка держит не всякое такое
 * значение точно (ADR-014). Числа на делениях оси — круглые отметки шкалы,
 * а не чьи-то рейтинги, им точность сотых не нужна.
 */

/** Поля под подписи: слева значения, снизу даты в две строки. */
export const CHART_PAD = { top: 12, right: 16, bottom: 40, left: 52 } as const;

/**
 * Запас по вертикали, когда все значения равны.
 *
 * Без него размах равен нулю и координата обращается в `NaN`, а SVG с `NaN`
 * не рисует ничего — вместо ровной линии человек получил бы пустоту.
 */
const FLAT_PADDING = 5;

/** Делений по оси значений — как у RTTF, пять линий хватает, шестая шумит. */
const Y_TICKS = 5;

export interface ChartBox {
  readonly width: number;
  readonly height: number;
}

export interface RatingChartPoint {
  readonly key: string;
  readonly x: number;
  readonly y: number;
  /** Рейтинг после турнира, строкой как пришёл. */
  readonly rating: string;
  /** Изменение за турнир, строкой как пришло. */
  readonly delta: string;
  readonly playedAt: string;
  readonly tournamentId: string | null;
  readonly tournamentName: string | null;
  /** Дуэль вне турнира (ADR-065): точка на каждую, с именем соперника. */
  readonly duel: RatingPointView['duel'];
}

/** Деление оси значений: круглое число и его высота. */
export interface ValueTick {
  readonly value: number;
  readonly y: number;
}

/** Деление оси времени. Год подписывается у первого деления и при смене года. */
export interface TimeTick {
  readonly time: number;
  readonly x: number;
  readonly unit: TimeTickUnit;
  readonly showYear: boolean;
}

export interface RatingScale {
  readonly width: number;
  readonly height: number;
  /** Границы области кривой внутри холста. */
  readonly plot: {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
  };
  readonly points: readonly RatingChartPoint[];
  /** Точки для `polyline`. Пусто, когда точка одна: ломаной из неё не выйдет. */
  readonly line: string;
  /** Контур заливки под кривой до нижней линии. Пусто вместе с `line`. */
  readonly area: string;
  readonly valueTicks: readonly ValueTick[];
  readonly timeTicks: readonly TimeTick[];
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
export function buildRatingScale(
  points: readonly RatingPointView[],
  box: ChartBox = { width: 640, height: 240 },
): RatingScale | null {
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
  const flat = Math.min(...values) === Math.max(...values);
  const { low, high, ticks } = valueAxis(
    Math.min(...values) - (flat ? FLAT_PADDING : 0),
    Math.max(...values) + (flat ? FLAT_PADDING : 0),
  );

  const plot = {
    left: CHART_PAD.left,
    right: Math.max(CHART_PAD.left + 1, box.width - CHART_PAD.right),
    top: CHART_PAD.top,
    bottom: Math.max(CHART_PAD.top + 1, box.height - CHART_PAD.bottom),
  };
  const innerWidth = plot.right - plot.left;
  const innerHeight = plot.bottom - plot.top;
  const span = last.time - first.time;
  const yOf = (value: number) => round(plot.top + innerHeight * ((high - value) / (high - low)));
  const xOf = (time: number) =>
    round(plot.left + (span > 0 ? (innerWidth * (time - first.time)) / span : innerWidth / 2));

  const chartPoints = entries.map((entry, position) => ({
    key:
      entry.point.tournamentId ??
      (entry.point.duel === null
        ? `adjustment-${String(entry.index)}`
        : `duel-${entry.point.duel.id}`),
    x: round(plot.left + innerWidth * horizontal(entry, first, span, position, entries.length)),
    y: yOf(entry.value),
    rating: entry.point.ratingAfter,
    delta: entry.point.delta,
    playedAt: entry.point.playedAt,
    tournamentId: entry.point.tournamentId,
    tournamentName: entry.point.tournamentName,
    duel: entry.point.duel,
  }));

  const line =
    chartPoints.length < 2
      ? ''
      : chartPoints.map((point) => `${String(point.x)},${String(point.y)}`).join(' ');
  const head = chartPoints[0];
  const tail = chartPoints.at(-1);

  return {
    width: box.width,
    height: box.height,
    plot,
    points: chartPoints,
    line,
    area:
      line === '' || head === undefined || tail === undefined
        ? ''
        : `M${String(head.x)},${String(plot.bottom)} L${line.replaceAll(' ', ' L')} L${String(tail.x)},${String(plot.bottom)} Z`,
    valueTicks: ticks.map((value) => ({ value, y: yOf(value) })),
    timeTicks: timeTicks(first.time, last.time, Math.max(2, Math.floor(innerWidth / 88))).map(
      (tick) => ({ ...tick, x: xOf(tick.time) }),
    ),
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

/**
 * Круглый шаг шкалы: 1, 2 или 5, умноженные на степень десяти.
 *
 * Не меньше единицы: деление «420.2» на оси рейтинга читается как чей-то
 * рейтинг, а не как отметка шкалы.
 */
export function niceStep(range: number, intervals: number): number {
  const rough = range / Math.max(1, intervals);

  if (!(rough > 0)) {
    return 1;
  }

  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;

  return Math.max(1, nice * power);
}

/**
 * Ось значений: границы, округлённые наружу до шага, и деления на них.
 * Кривая всегда лежит между крайними линиями сетки, а не обрезается ими.
 */
export function valueAxis(
  min: number,
  max: number,
): { readonly low: number; readonly high: number; readonly ticks: readonly number[] } {
  const step = niceStep(max - min, Y_TICKS - 1);
  const low = Math.floor(min / step) * step;
  const high = Math.max(Math.ceil(max / step) * step, low + step);
  const ticks: number[] = [];

  for (let value = low; value <= high + step / 2; value += step) {
    ticks.push(value);
  }

  return { low, high, ticks };
}

interface Candidate {
  readonly unit: TimeTickUnit;
  readonly step: number;
}

/** От мелкого шага к крупному: берётся первый, при котором подписи помещаются. */
const CANDIDATES: readonly Candidate[] = [
  { unit: 'day', step: 1 },
  { unit: 'day', step: 2 },
  { unit: 'day', step: 7 },
  { unit: 'day', step: 14 },
  { unit: 'month', step: 1 },
  { unit: 'month', step: 2 },
  { unit: 'month', step: 3 },
  { unit: 'month', step: 6 },
  { unit: 'year', step: 1 },
  { unit: 'year', step: 2 },
  { unit: 'year', step: 5 },
  { unit: 'year', step: 10 },
];

/**
 * Деления оси времени — на границах дня, месяца или года по часам человека.
 *
 * Отметки на круглых датах, а не на датах турниров: «1 мар.», «апр.», «2026»
 * читаются как шкала, а дата каждого турнира и так есть в подсказке. Шаг —
 * самый мелкий, при котором подписей не больше `max`. Если в размах не
 * попала ни одна граница — турниры одного дня, — деление одно, на нём.
 */
export function timeTicks(from: number, to: number, max: number): readonly Omit<TimeTick, 'x'>[] {
  for (const candidate of CANDIDATES) {
    const times = boundaries(from, to, candidate, max + 1);

    if (times.length > 0 && times.length <= max) {
      return withYears(times, candidate.unit);
    }
  }

  return withYears([from], 'day');
}

/** Границы шага внутри `[from, to]`; перебор останавливается, превысив `limit`. */
function boundaries(from: number, to: number, { unit, step }: Candidate, limit: number): number[] {
  const start = new Date(from);
  const cursor =
    unit === 'year'
      ? new Date(Math.ceil(start.getFullYear() / step) * step, 0, 1)
      : unit === 'month'
        ? new Date(start.getFullYear(), start.getMonth(), 1)
        : new Date(start.getFullYear(), start.getMonth(), start.getDate());

  // Месяцы — кратными шагу от января, чтобы «янв., апр., июль» не съезжали
  // в «февр., май» от того, с какого месяца началась история.
  if (unit === 'month') {
    cursor.setMonth(Math.ceil(cursor.getMonth() / step) * step);
  }

  const times: number[] = [];

  while (times.length <= limit) {
    if (cursor.getTime() > to) {
      break;
    }

    if (cursor.getTime() >= from) {
      times.push(cursor.getTime());
    }

    if (unit === 'year') cursor.setFullYear(cursor.getFullYear() + step);
    else if (unit === 'month') cursor.setMonth(cursor.getMonth() + step);
    else cursor.setDate(cursor.getDate() + step);
  }

  return times;
}

function withYears(times: readonly number[], unit: TimeTickUnit): Omit<TimeTick, 'x'>[] {
  return times.map((time, index) => {
    const previous = times[index - 1];

    return {
      time,
      unit,
      // У годового шага год и есть подпись, вторая строка не нужна.
      showYear:
        unit !== 'year' &&
        (previous === undefined ||
          new Date(previous).getFullYear() !== new Date(time).getFullYear()),
    };
  });
}

/**
 * Точка, ближайшая к указателю по горизонтали.
 *
 * Перекрестие ищет дату, а не линию: попасть в двухпиксельную кривую пальцем
 * нельзя, а «ближайший турнир слева или справа» — можно всегда.
 */
export function nearestPoint(points: readonly RatingChartPoint[], x: number): number {
  let best = -1;
  let distance = Number.POSITIVE_INFINITY;

  points.forEach((point, index) => {
    const next = Math.abs(point.x - x);

    // Нестрогое сравнение: из турниров одного дня берётся последний — он
    // и дал итоговый рейтинг этой даты.
    if (next <= distance) {
      best = index;
      distance = next;
    }
  });

  return best;
}

/** Период графика: последние 10 турниров, полгода, год, всё время (ADR-048). */
export type Span = 'last10' | 'half' | 'year' | 'all';

/** Точки периода. Месяцы — календарные, считаются от сегодняшнего дня. */
export function pointsOf(
  points: readonly RatingPointView[],
  span: Span,
  now: Date,
): readonly RatingPointView[] {
  if (span === 'all') return points;
  if (span === 'last10') return points.slice(-10);

  const from = new Date(now);
  from.setMonth(from.getMonth() - (span === 'half' ? 6 : 12));

  return points.filter((point) => Date.parse(point.playedAt) >= from.getTime());
}
