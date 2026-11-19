import type { CSSProperties } from 'react';

/** Задержка подъёма строки при загрузке — фирменный жест первого экрана. */
export function rise(delay: number): { className: string; style: CSSProperties } {
  return {
    className: 'hero-rise',
    style: { '--motion-delay': `${String(delay)}ms` } as CSSProperties,
  };
}

/** Строка карточки на постере: ссылка растянута на всю строку — цель нажатия крупнее. */
export const NIGHT_ROW = {
  position: 'relative',
  display: 'grid',
  alignItems: 'center',
  columnGap: 1.5,
  px: 2,
  borderTop: '1px solid var(--night-line)',
  transition: 'background-color var(--dur-fast) var(--ease)',
  '@media (hover: hover)': {
    '&:hover': { bgcolor: 'color-mix(in srgb, var(--night-raised) 70%, transparent)' },
  },
  '& a[data-row-link]::after': { content: '""', position: 'absolute', inset: 0 },
} as const;

/** Подпись строки — тише и мельче. */
export const NIGHT_MUTED = {
  fontSize: 12,
  lineHeight: 1.4,
  color: 'var(--night-ink-500)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;
