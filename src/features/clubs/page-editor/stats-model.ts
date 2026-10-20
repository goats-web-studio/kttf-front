import type { ClubStatsView } from '@kttf/shared/types';

import {
  summarizeStatRows,
  type StatsSummary as Summary,
  type StatDay,
  type StatTotal,
} from '@/common/ui/stats-model';

export type { StatDay, StatTotal };

/** Метрики плиток статистики. Сайт и Инстаграм — одной: обе ведут «почитать о клубе». */
/**
 * `coachTraining` — «Записаться» к тренерам, которые проводят свои
 * тренировки в зале клуба: писали тренеру, клубу — отдельной строкой
 * (ADR-059, решение владельца от 21.10.2026).
 */
export const STAT_METRICS = [
  'views',
  'phone',
  'whatsapp',
  'telegram',
  'route',
  'links',
  'coachTraining',
] as const;
export type StatMetric = (typeof STAT_METRICS)[number];

export type StatsSummary = Summary<StatMetric>;

/** Сводка статистики клуба для экрана: суммы по метрикам и просмотры по дням. */
export function summarizeStats(view: ClubStatsView): StatsSummary {
  return summarizeStatRows(view, STAT_METRICS, (row) => ({
    views: row.views,
    phone: row.phone,
    whatsapp: row.whatsapp,
    telegram: row.telegram,
    route: row.route,
    links: row.website + row.instagram,
    coachTraining: row.coachTraining,
  }));
}
