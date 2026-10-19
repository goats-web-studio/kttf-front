import type { CoachView } from '@kttf/shared/types';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';

import { useT } from '@/common/i18n';
import type { StatsPeriod } from '@/common/ui/stats-model';
import StatsPanel from '@/common/ui/stats-panel';

import { coachStatsQuery } from '../queries';
import { COACH_STAT_LABELS, COACH_STAT_METRICS, summarizeCoachStats } from '../stats-model';

/**
 * «Статистика» тренера — механика `ClubStatDaily` (ADR-059): просмотры и
 * нажатия на способы связи по дням, органика отдельно от рекламы KTTF.
 */
export default function CoachStatsPanel({ coach }: { readonly coach: CoachView }): ReactNode {
  const t = useT();
  const [period, setPeriod] = useState<StatsPeriod>('30');
  const stats = useQuery(coachStatsQuery(coach.id, Number(period)));
  const summary = useMemo(
    () => (stats.data === undefined ? null : summarizeCoachStats(stats.data)),
    [stats.data],
  );

  return (
    <StatsPanel
      lead={t('coach.editor.statsLead')}
      period={period}
      onPeriod={setPeriod}
      stats={stats}
      summary={summary}
      metrics={COACH_STAT_METRICS}
      labels={COACH_STAT_LABELS}
    />
  );
}
