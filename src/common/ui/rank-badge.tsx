import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

/** Медаль для мест 1–3; дальше место пишется числом без кружка. */
const MEDAL: Readonly<Record<number, string>> = {
  1: 'var(--gold)',
  2: 'var(--silver)',
  3: 'var(--bronze)',
};

/**
 * Место в рейтинге или турнире. Тройка лидеров — в кружке цвета медали,
 * остальные — числом: медаль работает, пока их три на экране, а не тридцать.
 * Число остаётся текстом в кружке — цвет не единственный носитель.
 */
export default function RankBadge({
  rank,
  label,
}: {
  readonly rank: number;
  /** Отформатированное число: разряды по языку интерфейса. */
  readonly label?: string;
}): ReactNode {
  const medal = MEDAL[rank];
  const text = label ?? String(rank);

  if (medal === undefined) {
    return (
      <Box
        component="span"
        sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}
      >
        {text}
      </Box>
    );
  }

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-grid',
        placeItems: 'center',
        width: 28,
        height: 28,
        borderRadius: '50%',
        bgcolor: medal,
        color: 'var(--ink-900)',
        fontWeight: 700,
        fontSize: 13,
        fontVariantNumeric: 'tabular-nums',
        boxShadow: 'inset 0 -2px 0 rgb(31 31 29 / 0.12)',
      }}
    >
      {text}
    </Box>
  );
}
