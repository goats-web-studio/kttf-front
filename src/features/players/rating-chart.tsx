import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { formatDate, useLocale, useT } from '@/common/i18n';

import type { RatingScale } from './rating-scale';

interface RatingChartProps {
  readonly scale: RatingScale;
}

/**
 * Кривая рейтинга — ТЗ 9.3.
 *
 * Рисуется своим SVG, без библиотеки графиков (ADR-028): десяток точек в год
 * не стоит зависимости, а публичная часть делит бандл с консолью судьи, куда
 * тяжёлое тянуть нельзя (ADR-004).
 *
 * Сам холст скрыт от чтения с экрана: кривую голосом не пересказать. Доступной
 * заменой служит список турниров под ним — в нём те же числа текстом. Подписи
 * границ и дат остаются обычной разметкой, а не текстом внутри SVG: иначе они
 * растягивались бы вместе с холстом.
 */
export default function RatingChart({ scale }: RatingChartProps): ReactNode {
  const t = useT();
  const locale = useLocale();

  return (
    <Box component="figure" sx={{ mt: 2, mx: 0, mb: 0 }}>
      {/* Подписи стоят у своих линий: обе в одной строке читались бы как
          легенда, и «минимум» оказывался бы сверху над верхней границей. */}
      <Typography variant="caption" color="text.secondary" component="p">
        {t('player.chart.highest')}{' '}
        <Box component="span" sx={NUM}>
          {scale.highest}
        </Box>
      </Typography>

      <Box
        sx={{
          mt: 0.5,
          color: 'var(--red-600)',
          '& > svg': { display: 'block', width: '100%', height: 'auto' },
        }}
      >
        <svg viewBox={`0 0 ${String(scale.width)} ${String(scale.height)}`} aria-hidden="true">
          {/* Границы размаха: без них глаз не понимает, крутая кривая или ровная. */}
          <line
            x1={0}
            y1={10}
            x2={scale.width}
            y2={10}
            stroke="var(--line)"
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={0}
            y1={scale.height - 10}
            x2={scale.width}
            y2={scale.height - 10}
            stroke="var(--line)"
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />

          {scale.line !== '' && (
            <polyline
              points={scale.line}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              // Толщина линии не растёт вместе с холстом: на широком экране
              // кривая иначе превращается в полосу.
              vectorEffect="non-scaling-stroke"
            />
          )}

          {scale.points.map((point) => (
            <circle key={point.key} cx={point.x} cy={point.y} r={4} fill="currentColor">
              <title>
                {point.tournamentName ?? t('player.history.adjustment')}: {point.rating}
              </title>
            </circle>
          ))}
        </svg>
      </Box>

      <Typography variant="caption" color="text.secondary" component="p">
        {t('player.chart.lowest')}{' '}
        <Box component="span" sx={NUM}>
          {scale.lowest}
        </Box>
      </Typography>

      <Typography
        component="figcaption"
        variant="caption"
        color="text.secondary"
        sx={{ mt: 0.5, display: 'flex', justifyContent: 'space-between' }}
      >
        <span>{formatDate(scale.from, locale)}</span>
        <span>{formatDate(scale.to, locale)}</span>
      </Typography>
    </Box>
  );
}

/** Границы размаха — одной ширины цифр (раздел 3.5). */
const NUM = { fontVariantNumeric: 'tabular-nums' } as const;
