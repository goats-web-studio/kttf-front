import type { RatingHistoryView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useState, type ReactNode } from 'react';

import { formatDate, useLocale, useT, type MessageKey } from '@/common/i18n';
import EmptyState from '@/common/ui/empty-state';
import RatingValue from '@/common/ui/rating-value';
import Surface from '@/common/ui/surface';

import PeriodTabs from './period-tabs';
import RatingChart from './rating-chart';
import { pointsOf, type Span } from './rating-scale';

const SPANS: readonly (readonly [Span, MessageKey])[] = [
  ['last10', 'profile.chart.last10'],
  ['half', 'profile.chart.half'],
  ['year', 'profile.chart.year'],
  ['all', 'profile.chart.all'],
];

/** Максимум за всю историю и когда он поставлен — из сводки сервера. */
export interface RatingPeak {
  readonly rating: string;
  readonly at: string | null;
}

/**
 * Кривая рейтинга с периодом — как у RTTF: последние 10 турниров, полгода,
 * год, всё время. История приходит целиком одним ответом, поэтому период
 * режется здесь, без запроса: точек у игрока десятки, а не тысячи.
 *
 * Над графиком — «Максимальный ★X (дата)» за всё время, а не за период:
 * максимум считает сервер по журналу, где он бывает и внутри турнира, а
 * точка графика — рейтинг на конец турнира.
 */
export default function RatingSection({
  history,
  peak,
}: {
  readonly history: RatingHistoryView;
  readonly peak: RatingPeak | null;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const [span, setSpan] = useState<Span>('all');
  const points = pointsOf(history.points, span, new Date());

  return (
    <Surface title={t('profile.rating.title')}>
      <PeriodTabs
        value={span}
        options={SPANS}
        label={t('profile.chart.label')}
        onChange={setSpan}
      />
      {peak !== null && history.points.length > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }} data-rating-peak>
          {t('profile.maxRating')}{' '}
          <RatingValue value={peak.rating} sx={{ color: 'text.primary', fontWeight: 700 }} />
          {peak.at !== null && <> ({formatDate(peak.at, locale)})</>}
        </Typography>
      )}
      <Box sx={{ mt: 1.5 }}>
        {points.length === 0 ? (
          <EmptyState title={t('player.history.empty')} />
        ) : (
          <RatingChart points={points} />
        )}
      </Box>
    </Surface>
  );
}
