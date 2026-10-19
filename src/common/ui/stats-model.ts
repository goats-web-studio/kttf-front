import type { TrafficSource } from '@kttf/shared/types';

import type { MessageKey } from '@/common/i18n';

/**
 * Статистика обращений на экране — механика `ClubStatDaily` (ADR-055,
 * решение 4), общая для клуба и тренера (ADR-059). Метрики у них разные:
 * у клуба есть маршрут и сайт, у тренера — нет, поэтому набор метрик и
 * способ достать их из строки задаёт тот, кто показывает.
 */

export interface StatTotal {
  readonly total: number;
  /** Из них — пришедшие с рекламы KTTF. */
  readonly campaign: number;
}

export interface StatDay {
  readonly date: string;
  readonly organic: number;
  readonly campaign: number;
}

export interface StatsSummary<M extends string> {
  readonly totals: Readonly<Record<M, StatTotal>>;
  /** Просмотры по каждому дню окна, включая пустые. */
  readonly days: readonly StatDay[];
}

/** Строка ответа: день, источник и просмотры есть у всех. */
export interface StatsRowBase {
  readonly date: string;
  readonly source: TrafficSource;
  readonly views: number;
}

export interface StatsViewBase<R extends StatsRowBase> {
  readonly from: string;
  readonly to: string;
  readonly rows: readonly R[];
}

/** Окно статистики: неделя или месяц. */
export const STATS_PERIODS = [
  ['7', 'manage.stats.days7'],
  ['30', 'manage.stats.days30'],
] as const satisfies readonly (readonly [string, MessageKey])[];

export type StatsPeriod = (typeof STATS_PERIODS)[number][0];

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Суммы по метрикам и просмотры по дням. Сервер отдаёт только дни, в
 * которые что-то было; пустые дорисовываются здесь — иначе на графике
 * неделя тишины схлопнется.
 */
export function summarizeStatRows<M extends string, R extends StatsRowBase>(
  view: StatsViewBase<R>,
  metrics: readonly M[],
  valuesOf: (row: R) => Readonly<Record<M, number>>,
): StatsSummary<M> {
  const totals = Object.fromEntries(
    metrics.map((metric) => [metric, { total: 0, campaign: 0 }]),
  ) as Record<M, StatTotal>;
  const byDay = new Map<string, { organic: number; campaign: number }>();

  for (const row of view.rows) {
    const values = valuesOf(row);
    const campaign = row.source === 'CAMPAIGN';

    for (const metric of metrics) {
      const current = totals[metric];
      totals[metric] = {
        total: current.total + values[metric],
        campaign: current.campaign + (campaign ? values[metric] : 0),
      };
    }

    const day = byDay.get(row.date) ?? { organic: 0, campaign: 0 };
    byDay.set(
      row.date,
      campaign
        ? { ...day, campaign: day.campaign + row.views }
        : { ...day, organic: day.organic + row.views },
    );
  }

  const days: StatDay[] = [];
  const from = Date.parse(`${view.from}T00:00:00Z`);
  const to = Date.parse(`${view.to}T00:00:00Z`);

  for (let time = from; time <= to; time += DAY_MS) {
    const date = new Date(time).toISOString().slice(0, 10);
    const day = byDay.get(date) ?? { organic: 0, campaign: 0 };
    days.push({ date, ...day });
  }

  return { totals, days };
}
