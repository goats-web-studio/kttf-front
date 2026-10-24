import type { RatingPointView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useNavigate } from '@tanstack/react-router';
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from 'react';

import { formatCount, formatDate, formatTimeTick, useLocale, useT } from '@/common/i18n';
import DeltaPill from '@/common/ui/delta-pill';
import { useMotionGroup } from '@/common/ui/motion-hooks';
import RatingValue from '@/common/ui/rating-value';

import { ratingPointHref, ratingPointTitle } from './rating-point';
import { buildRatingScale, nearestPoint, type RatingChartPoint } from './rating-scale';

/** Ширина до первого замера и в среде без раскладки (тесты). */
const FALLBACK_WIDTH = 640;
/** Высота холста: на телефоне ниже, чтобы график и вкладки влезали в экран. */
const HEIGHT = { wide: 260, narrow: 200 } as const;
const NARROW = 480;
/** Больше стольких точек кружки не рисуются: кривая из бусин читается хуже линии. */
const DOTS_UP_TO = 30;

interface RatingChartProps {
  readonly points: readonly RatingPointView[];
}

/**
 * Кривая рейтинга как у RTTF — ТЗ 9.3, ADR-050: сетка со значениями и
 * датами, заливка под кривой, подсказка о турнире под указателем.
 *
 * Рисуется своим SVG, без библиотеки графиков (07, раздел 2): десяток точек
 * в год не стоит зависимости, а публичная часть делит бандл с консолью судьи.
 *
 * Перекрестие ищет ближайший турнир по горизонтали — попадать в линию не
 * нужно. Мышь ведёт подсказку наведением, палец — касанием и протяжкой,
 * клавиатура — стрелками. Вертикальная прокрутка страницы пальцем остаётся:
 * холст забирает себе только горизонтальный жест.
 *
 * Точка турнира ведёт на его страницу: мышью — щелчком (с Ctrl или Cmd — в
 * новой вкладке), пальцем — повторным касанием той же точки (первое
 * показывает подсказку), клавиатурой — Enter. Корректировка вне турнира
 * никуда не ведёт.
 *
 * Подсказка дополняет, а не прячет: те же числа есть текстом в результатах
 * по турнирам ниже. Сам холст скрыт от чтения с экрана, а подсказка
 * объявляется вежливо — человек с клавиатурой слышит турнир, на который
 * перешёл.
 */
export default function RatingChart({ points }: RatingChartProps): ReactNode {
  const t = useT();
  const locale = useLocale();
  const gradient = useId();
  const frame = useRef<HTMLDivElement>(null);
  const width = useWidth(frame);
  const height = width < NARROW ? HEIGHT.narrow : HEIGHT.wide;
  const scale = buildRatingScale(points, { width, height });
  const [active, setActive] = useState<number | null>(null);
  const navigate = useNavigate();
  // Каким указателем нажали последний раз: щелчок после касания — не
  // переход, его делает само касание.
  const pointer = useRef('mouse');
  // Линия рисуется слева направо при первом показе, заливка и точки
  // проявляются следом — история читается как путь, а не как картинка.
  const [motionRef, motion] = useMotionGroup();

  if (scale === null) {
    return null;
  }

  const { plot } = scale;
  const current = active === null ? undefined : scale.points[active];
  const dots = scale.points.length <= DOTS_UP_TO;

  const nearest = (event: PointerEvent<SVGSVGElement>): number | null => {
    const box = event.currentTarget.getBoundingClientRect();
    // Холст в пикселях места, но страховка от масштаба браузера не мешает.
    const x = ((event.clientX - box.left) / (box.width || width)) * width;
    const index = nearestPoint(scale.points, x);

    return index < 0 ? null : index;
  };

  const pick = (event: PointerEvent<SVGSVGElement>) => {
    setActive(nearest(event));
  };

  /** Турнир или дуэль точки — на их страницу; в новой вкладке, если попросили. */
  const open = (index: number | null, newTab = false) => {
    const point = index === null ? undefined : scale.points[index];
    const href = point === undefined ? null : ratingPointHref(point);

    if (href === null) return;
    if (newTab) {
      window.open(href, '_blank', 'noopener');
      return;
    }
    void navigate({ href });
  };

  const press = (event: PointerEvent<SVGSVGElement>) => {
    const index = nearest(event);
    pointer.current = event.pointerType;

    // Касание: первое показывает подсказку, второе по той же точке — переход.
    if (event.pointerType !== 'mouse' && index !== null && index === active) {
      open(index);
      return;
    }
    setActive(index);
  };

  const step = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = scale.points.length - 1;
    const moves: Readonly<Record<string, number>> = {
      ArrowLeft: Math.max(0, (active ?? last + 1) - 1),
      ArrowRight: Math.min(last, (active ?? -1) + 1),
      Home: 0,
      End: last,
    };
    const next = moves[event.key];

    if (next !== undefined) {
      event.preventDefault();
      setActive(next);
    } else if (event.key === 'Enter') {
      open(active, event.ctrlKey || event.metaKey);
    } else if (event.key === 'Escape') {
      setActive(null);
    }
  };

  return (
    <Box
      ref={frame}
      component="figure"
      tabIndex={0}
      aria-label={t('profile.chart.hint')}
      onKeyDown={step}
      onBlur={() => {
        setActive(null);
      }}
      sx={{
        position: 'relative',
        m: 0,
        borderRadius: 3,
        '&:focus-visible': { outline: '2px solid var(--red-600)', outlineOffset: '4px' },
      }}
    >
      <svg
        width={scale.width}
        height={scale.height}
        viewBox={`0 0 ${String(scale.width)} ${String(scale.height)}`}
        aria-hidden="true"
        data-rating-chart
        ref={motionRef}
        data-motion={motion}
        style={{
          display: 'block',
          touchAction: 'pan-y',
          userSelect: 'none',
          cursor:
            current === undefined || ratingPointHref(current) === null ? 'default' : 'pointer',
        }}
        onPointerMove={pick}
        onPointerDown={press}
        onClick={(event) => {
          // Щелчок мыши; касание обработано в `press`.
          if (pointer.current !== 'mouse') return;
          open(active, event.ctrlKey || event.metaKey);
        }}
        onPointerLeave={(event) => {
          // Палец «уходит» с холста сразу после касания — подсказка остаётся,
          // пока человек не тронет другое место. Мышь уводят — подсказка гаснет.
          if (event.pointerType === 'mouse') setActive(null);
        }}
      >
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--red-500)" stopOpacity={0.18} />
            <stop offset="100%" stopColor="var(--red-500)" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Сетка приглушена: она служит кривой, а не спорит с ней. */}
        <g stroke="var(--line)" strokeWidth={1}>
          {scale.valueTicks.map((tick) => (
            <line
              key={`v${String(tick.value)}`}
              x1={plot.left}
              x2={plot.right}
              y1={tick.y}
              y2={tick.y}
            />
          ))}
          {scale.timeTicks.map((tick) => (
            <line
              key={`t${String(tick.time)}`}
              x1={tick.x}
              x2={tick.x}
              y1={plot.top}
              y2={plot.bottom}
              strokeDasharray="2 4"
            />
          ))}
        </g>

        <g
          fill="var(--ink-500)"
          fontSize={12}
          style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-mono)' }}
        >
          {scale.valueTicks.map((tick) => (
            <text
              key={`vl${String(tick.value)}`}
              x={plot.left - 8}
              y={tick.y}
              textAnchor="end"
              dominantBaseline="middle"
            >
              {formatCount(tick.value, locale)}
            </text>
          ))}
        </g>
        <g fill="var(--ink-500)" fontSize={12}>
          {scale.timeTicks.map((tick) => {
            // Крайние подписи прижимаются внутрь, чтобы не вылезать за холст.
            const anchor =
              tick.x - plot.left < 24 ? 'start' : plot.right - tick.x < 24 ? 'end' : 'middle';

            return (
              <text
                key={`tl${String(tick.time)}`}
                x={tick.x}
                y={plot.bottom + 18}
                textAnchor={anchor}
              >
                {formatTimeTick(tick.time, tick.unit, locale)}
                {tick.showYear && (
                  <tspan x={tick.x} dy={14}>
                    {formatTimeTick(tick.time, 'year', locale)}
                  </tspan>
                )}
              </text>
            );
          })}
        </g>

        {scale.area !== '' && (
          <path
            d={scale.area}
            fill={`url(#${gradient})`}
            className="motion-fade"
            style={{ '--motion-delay': '500ms' } as CSSProperties}
          />
        )}
        {scale.line !== '' && (
          <polyline
            points={scale.line}
            pathLength={1}
            className="motion-draw"
            fill="none"
            stroke="var(--red-500)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {current !== undefined && (
          <line
            x1={current.x}
            x2={current.x}
            y1={plot.top}
            y2={plot.bottom}
            stroke="var(--ink-400)"
            strokeWidth={1}
          />
        )}

        {scale.points.map((point, index) =>
          dots || index === active || scale.points.length === 1 ? (
            <circle
              key={point.key}
              cx={point.x}
              cy={point.y}
              r={index === active ? 6 : 4}
              fill="var(--red-500)"
              // Белое кольцо отделяет точку от линии и сетки под ней.
              stroke="var(--paper)"
              strokeWidth={2}
              // Постоянные точки появляются, когда до них дотянулась линия.
              className={dots ? 'motion-pop' : undefined}
              style={
                dots
                  ? ({
                      '--motion-delay': `${String(Math.round(200 + (900 * index) / scale.points.length))}ms`,
                    } as CSSProperties)
                  : undefined
              }
            />
          ) : null,
        )}
      </svg>

      <Box aria-live="polite" sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {current !== undefined && <Tip point={current} width={scale.width} plotTop={plot.top} />}
      </Box>
    </Box>
  );
}

/** Подсказка о точке: дата, турнир или дуэль, рейтинг после, изменение. */
function Tip({
  point,
  width,
  plotTop,
}: {
  readonly point: RatingChartPoint;
  readonly width: number;
  readonly plotTop: number;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  // Над точкой, а у верхнего края — под ней; у боковых краёв — прижата внутрь.
  const below = point.y - plotTop < 96;
  const shift = point.x < 110 ? '-12px' : width - point.x < 110 ? 'calc(-100% + 12px)' : '-50%';

  return (
    <Box
      data-rating-tip
      sx={{
        position: 'absolute',
        left: point.x,
        top: point.y,
        transform: `translate(${shift}, ${below ? '14px' : 'calc(-100% - 14px)'})`,
        minWidth: 168,
        maxWidth: 240,
        px: 1.5,
        py: 1.25,
        borderRadius: 3,
        bgcolor: 'var(--paper)',
        border: 1,
        borderColor: 'var(--line)',
        boxShadow: 'var(--shadow-pop)',
      }}
    >
      <Typography variant="caption" color="text.secondary" component="p">
        {formatDate(point.playedAt, locale)}
      </Typography>
      <Typography variant="body2" component="p" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
        {ratingPointTitle(point, t)}
      </Typography>
      <Box sx={{ mt: 0.75, display: 'flex', alignItems: 'center', gap: 1 }}>
        <RatingValue value={point.rating} sx={{ fontWeight: 700, fontSize: 18 }} animate={false} />
        <DeltaPill value={point.delta} />
      </Box>
      {ratingPointHref(point) !== null && (
        <Typography
          variant="caption"
          component="p"
          sx={{ mt: 0.75, fontWeight: 600, color: 'var(--red-600)' }}
        >
          {t(point.tournamentId === null ? 'profile.chart.openDuel' : 'profile.chart.open')}
        </Typography>
      )}
    </Box>
  );
}

/**
 * Ширина места под холст. Замер, а не растяжение SVG: подписи осей и точки
 * держат свой размер на любом экране.
 */
function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(FALLBACK_WIDTH);

  useLayoutEffect(() => {
    const element = ref.current;

    if (element === null) {
      return undefined;
    }

    const measure = () => {
      const next = Math.floor(element.getBoundingClientRect().width);

      // Ноль — среда без раскладки: остаётся ширина по умолчанию.
      if (next > 0) setWidth(next);
    };

    measure();

    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return width;
}
