import type { CoachStatsView } from '@kttf/shared/types';

import type { MessageKey } from '@/common/i18n';
import { summarizeStatRows, type StatsSummary } from '@/common/ui/stats-model';

/**
 * Метрики статистики тренера — `CoachStatDaily` (ADR-059): просмотры и
 * нажатия на каждый способ связи. Маршрута и сайта, как у клуба, нет.
 */
export const COACH_STAT_METRICS = ['views', 'phone', 'whatsapp', 'telegram', 'instagram'] as const;
export type CoachStatMetric = (typeof COACH_STAT_METRICS)[number];

export const COACH_STAT_LABELS: Readonly<Record<CoachStatMetric, MessageKey>> = {
  views: 'manage.stats.views',
  phone: 'manage.stats.calls',
  whatsapp: 'manage.stats.whatsapp',
  telegram: 'manage.stats.telegram',
  instagram: 'club.contact.instagram',
};

export function summarizeCoachStats(view: CoachStatsView): StatsSummary<CoachStatMetric> {
  return summarizeStatRows(view, COACH_STAT_METRICS, (row) => ({
    views: row.views,
    phone: row.phone,
    whatsapp: row.whatsapp,
    telegram: row.telegram,
    instagram: row.instagram,
  }));
}
