import type { ClubStatsView } from '@kttf/shared/types';

/** Метрики плиток статистики. Сайт и Инстаграм — одной: обе ведут «почитать о клубе». */
export const STAT_METRICS = ['views', 'phone', 'whatsapp', 'telegram', 'route', 'links'] as const;
export type StatMetric = (typeof STAT_METRICS)[number];

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

export interface StatsSummary {
  readonly totals: Readonly<Record<StatMetric, StatTotal>>;
  /** Просмотры по каждому дню окна, включая пустые. */
  readonly days: readonly StatDay[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Сводка статистики для экрана: суммы по метрикам и просмотры по дням.
 * Сервер отдаёт только дни, в которые что-то было; пустые дни
 * дорисовываются здесь — иначе на графике неделя тишины схлопнется.
 */
export function summarizeStats(view: ClubStatsView): StatsSummary {
  const empty = (): StatTotal => ({ total: 0, campaign: 0 });
  const totals: Record<StatMetric, StatTotal> = {
    views: empty(),
    phone: empty(),
    whatsapp: empty(),
    telegram: empty(),
    route: empty(),
    links: empty(),
  };
  const byDay = new Map<string, { organic: number; campaign: number }>();

  for (const row of view.rows) {
    const values: Record<StatMetric, number> = {
      views: row.views,
      phone: row.phone,
      whatsapp: row.whatsapp,
      telegram: row.telegram,
      route: row.route,
      links: row.website + row.instagram,
    };
    const campaign = row.source === 'CAMPAIGN';

    for (const metric of Object.keys(values) as StatMetric[]) {
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
