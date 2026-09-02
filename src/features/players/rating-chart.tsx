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
    <figure className="mt-4">
      {/* Подписи стоят у своих линий: обе в одной строке читались бы как
          легенда, и «минимум» оказывался бы сверху над верхней границей. */}
      <p className="text-xs text-slate-500">
        {t('player.chart.highest')} <span className="tabular-nums">{scale.highest}</span>
      </p>

      <svg
        viewBox={`0 0 ${String(scale.width)} ${String(scale.height)}`}
        className="mt-1 w-full text-blue-700"
        aria-hidden="true"
      >
        {/* Границы размаха: без них глаз не понимает, крутая кривая или ровная. */}
        <line
          x1={0}
          y1={10}
          x2={scale.width}
          y2={10}
          className="stroke-slate-200"
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={0}
          y1={scale.height - 10}
          x2={scale.width}
          y2={scale.height - 10}
          className="stroke-slate-200"
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

      <p className="text-xs text-slate-500">
        {t('player.chart.lowest')} <span className="tabular-nums">{scale.lowest}</span>
      </p>

      <figcaption className="mt-1 flex justify-between text-xs text-slate-500">
        <span>{formatDate(scale.from, locale)}</span>
        <span>{formatDate(scale.to, locale)}</span>
      </figcaption>
    </figure>
  );
}
