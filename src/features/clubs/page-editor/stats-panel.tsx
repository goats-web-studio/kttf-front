import type { ClubView } from '@kttf/shared/types';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';

import { useT, type MessageKey } from '@/common/i18n';
import type { StatsPeriod } from '@/common/ui/stats-model';
import StatsPanel from '@/common/ui/stats-panel';

import { clubStatsQuery } from '../queries';
import { STAT_METRICS, summarizeStats, type StatMetric } from './stats-model';

const METRIC_LABELS: Readonly<Record<StatMetric, MessageKey>> = {
  views: 'manage.stats.views',
  phone: 'manage.stats.calls',
  whatsapp: 'manage.stats.whatsapp',
  telegram: 'manage.stats.telegram',
  route: 'manage.stats.route',
  links: 'manage.stats.links',
  coachTraining: 'manage.stats.coachTraining',
};

/**
 * Статистика обращений клуба — ADR-055, решение 4. Экран общий с тренером
 * (`common/ui/stats-panel`), здесь — метрики клуба и его запрос.
 */
export default function ClubStatsPanel({ club }: { readonly club: ClubView }): ReactNode {
  const t = useT();
  const [period, setPeriod] = useState<StatsPeriod>('30');
  const stats = useQuery(clubStatsQuery(club.id, Number(period)));
  const summary = useMemo(
    () => (stats.data === undefined ? null : summarizeStats(stats.data)),
    [stats.data],
  );

  return (
    <StatsPanel
      lead={t('manage.stats.lead')}
      period={period}
      onPeriod={setPeriod}
      stats={stats}
      summary={summary}
      metrics={STAT_METRICS}
      labels={METRIC_LABELS}
    />
  );
}
