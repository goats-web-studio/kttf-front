import Box from '@mui/material/Box';
import { ratingLevel } from '@kttf/shared/rating';
import type { ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';

import { LEVEL_NAME } from './level-name';

const RADIUS = 15;
const CIRCLE = 2 * Math.PI * RADIUS;

const TONE = {
  paper: { track: 'var(--line)', arc: 'var(--red-600)', ink: 'var(--ink-900)' },
  night: { track: 'var(--night-line)', arc: 'var(--night-red)', ink: 'var(--night-ink-900)' },
} as const;

/**
 * Уровень игры 1–10 по рейтингу — ADR-070.
 *
 * Кольцо заполнено на уровень из десяти, номер внутри: читается и числом,
 * и формой, как уровни FACEIT. Цвет один — акцентный: светофор по уровням
 * означал бы «плохо — хорошо», а уровень не оценка игрока, а его место
 * на шкале. Название уровня — в подписи для чтения с экрана и во
 * всплывающей подсказке, рядом его выводит тот, кому хватает места.
 */
export default function LevelBadge({
  rating,
  tone = 'paper',
  size = 32,
}: {
  /** Рейтинг строкой, как он приходит с сервера, или числом. */
  readonly rating: string | number;
  readonly tone?: keyof typeof TONE;
  readonly size?: number;
}): ReactNode {
  const t = useT();
  const level = ratingLevel(Number(rating));
  const colors = TONE[tone];
  const label = fill(t('level.aria'), { level: String(level), name: t(LEVEL_NAME[level]) });

  return (
    <Box
      component="span"
      role="img"
      aria-label={label}
      title={label}
      data-level={level}
      sx={{
        position: 'relative',
        display: 'inline-grid',
        placeItems: 'center',
        width: size,
        height: size,
        flexShrink: 0,
        color: colors.ink,
        fontWeight: 700,
        fontSize: size <= 28 ? 12 : 13,
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1,
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 36 36"
        aria-hidden
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <circle cx="18" cy="18" r={RADIUS} fill="none" stroke={colors.track} strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r={RADIUS}
          fill="none"
          stroke={colors.arc}
          strokeWidth="3"
          strokeLinecap={level === 10 ? 'butt' : 'round'}
          strokeDasharray={`${String((CIRCLE * level) / 10)} ${String(CIRCLE)}`}
          transform="rotate(-90 18 18)"
        />
      </Box>
      <Box component="span" aria-hidden sx={{ position: 'relative' }}>
        {level}
      </Box>
    </Box>
  );
}
