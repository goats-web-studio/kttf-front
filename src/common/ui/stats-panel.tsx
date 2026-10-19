import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { fill, formatCount, formatDate, useLocale, useT, type MessageKey } from '@/common/i18n';
import PillTabs from '@/common/ui/pill-tabs';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { VISUALLY_HIDDEN } from '@/common/ui/visually-hidden';

import { STATS_PERIODS, type StatDay, type StatsPeriod, type StatsSummary } from './stats-model';

interface StatsPanelProps<M extends string> {
  readonly lead: string;
  readonly period: StatsPeriod;
  readonly onPeriod: (period: StatsPeriod) => void;
  /** Запрос статистики за выбранный период — его держит тот, кто показывает. */
  readonly stats: Pick<UseQueryResult, 'isPending' | 'error' | 'refetch'>;
  /** Сводка ответа; `null` — ответа ещё нет. */
  readonly summary: StatsSummary<M> | null;
  readonly metrics: readonly M[];
  readonly labels: Readonly<Record<M, MessageKey>>;
}

/**
 * Статистика обращений — то, чем KTTF показывает отдачу клубу (ADR-055,
 * решение 4) и тренеру (ADR-059). Просмотры и нажатия на способы связи, и
 * отдельно — сколько из них пришло с рекламы платформы.
 */
export default function StatsPanel<M extends string>({
  lead,
  period,
  onPeriod,
  stats,
  summary,
  metrics,
  labels,
}: StatsPanelProps<M>): ReactNode {
  const t = useT();
  const locale = useLocale();

  return (
    <Paper variant="outlined" component="section" sx={{ mt: 3, p: { xs: 2.5, sm: 4 } }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Typography variant="h2">{t('manage.stats.title')}</Typography>
        <PillTabs
          value={period}
          options={STATS_PERIODS}
          label={t('manage.stats.period')}
          onChange={onPeriod}
        />
      </Box>
      <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 680 }}>
        {lead}
      </Typography>

      <Box sx={{ mt: 3 }}>
        <QueryState
          isPending={stats.isPending}
          error={stats.error}
          onRetry={() => void stats.refetch()}
          loading={<RowsSkeleton rows={2} />}
        >
          {summary !== null && (
            <>
              <Box
                sx={{
                  display: 'grid',
                  gap: 1.5,
                  gridTemplateColumns: {
                    xs: '1fr 1fr',
                    md: `repeat(${String(metrics.length)}, 1fr)`,
                  },
                }}
              >
                {metrics.map((metric) => (
                  <Box
                    key={metric}
                    sx={{ p: 2, borderRadius: 3, bgcolor: 'var(--paper-sunken)', minWidth: 0 }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {t(labels[metric])}
                    </Typography>
                    <Typography
                      sx={{
                        mt: 0.5,
                        fontFamily: 'var(--font-display)',
                        fontSize: 28,
                        lineHeight: '32px',
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatCount(summary.totals[metric].total, locale)}
                    </Typography>
                    {summary.totals[metric].campaign > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        {fill(t('manage.stats.fromAds'), {
                          count: formatCount(summary.totals[metric].campaign, locale),
                        })}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
              {summary.days.every((day) => day.organic + day.campaign === 0) ? (
                <Typography color="text.secondary" sx={{ mt: 3 }}>
                  {t('manage.stats.empty')}
                </Typography>
              ) : (
                <ViewsChart days={summary.days} label={t('manage.stats.chart')} locale={locale} />
              )}
            </>
          )}
        </QueryState>
      </Box>
    </Paper>
  );
}

const CHART_HEIGHT = 120;

/**
 * Просмотры по дням — столбики своим SVG (ADR-028: библиотеку графиков не
 * подключаем). Тёмная часть столбика — органика, красная — с рекламы KTTF:
 * красный здесь и есть то, что продаётся. Для чтеца экрана — таблица.
 */
function ViewsChart({
  days,
  label,
  locale,
}: {
  readonly days: readonly StatDay[];
  readonly label: string;
  readonly locale: Parameters<typeof formatDate>[1];
}): ReactNode {
  const max = Math.max(1, ...days.map((day) => day.organic + day.campaign));
  const width = 100 / days.length;

  return (
    <Box component="figure" sx={{ m: 0, mt: 4 }}>
      <Typography component="figcaption" variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {label}
      </Typography>
      <Box
        component="svg"
        viewBox={`0 0 100 ${String(CHART_HEIGHT)}`}
        preserveAspectRatio="none"
        aria-hidden
        sx={{ display: 'block', width: '100%', height: CHART_HEIGHT }}
      >
        {days.map((day, index) => {
          const organic = (day.organic / max) * CHART_HEIGHT;
          const campaign = (day.campaign / max) * CHART_HEIGHT;
          const x = index * width + width * 0.15;
          const barWidth = width * 0.7;

          return (
            <g key={day.date}>
              <rect
                x={x}
                y={CHART_HEIGHT - organic - campaign}
                width={barWidth}
                height={campaign}
                fill="var(--red-500)"
              />
              <rect
                x={x}
                y={CHART_HEIGHT - organic}
                width={barWidth}
                height={organic}
                fill="var(--ink-700)"
              />
            </g>
          );
        })}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          {formatDate(`${days[0]?.date ?? ''}T12:00:00Z`, locale)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {formatDate(`${days.at(-1)?.date ?? ''}T12:00:00Z`, locale)}
        </Typography>
      </Box>
      <Box component="table" sx={VISUALLY_HIDDEN}>
        <tbody>
          {days.map((day) => (
            <tr key={day.date}>
              <td>{formatDate(`${day.date}T12:00:00Z`, locale)}</td>
              <td>{day.organic + day.campaign}</td>
            </tr>
          ))}
        </tbody>
      </Box>
    </Box>
  );
}
