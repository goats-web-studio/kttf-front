import type { RatingHistoryView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import { useState, type ReactNode } from 'react';

import { useT, type MessageKey } from '@/common/i18n';
import EmptyState from '@/common/ui/empty-state';
import Surface from '@/common/ui/surface';

import PeriodTabs from './period-tabs';
import RatingChart from './rating-chart';
import { buildRatingScale, pointsOf, type Span } from './rating-scale';

const SPANS: readonly (readonly [Span, MessageKey])[] = [
  ['last10', 'profile.chart.last10'],
  ['half', 'profile.chart.half'],
  ['year', 'profile.chart.year'],
  ['all', 'profile.chart.all'],
];

/**
 * Кривая рейтинга с периодом — как у RTTF: последние 10 турниров, полгода,
 * год, всё время. История приходит целиком одним ответом, поэтому период
 * режется здесь, без запроса: точек у игрока десятки, а не тысячи.
 */
export default function RatingSection({
  history,
}: {
  readonly history: RatingHistoryView;
}): ReactNode {
  const t = useT();
  const [span, setSpan] = useState<Span>('all');
  const scale = buildRatingScale(pointsOf(history.points, span, new Date()));

  return (
    <Surface title={t('profile.rating.title')}>
      <PeriodTabs
        value={span}
        options={SPANS}
        label={t('profile.chart.label')}
        onChange={setSpan}
      />
      <Box sx={{ mt: 1 }}>
        {scale === null ? (
          <EmptyState title={t('player.history.empty')} />
        ) : (
          <RatingChart scale={scale} />
        )}
      </Box>
    </Surface>
  );
}
