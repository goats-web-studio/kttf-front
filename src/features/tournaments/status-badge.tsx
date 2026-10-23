import type { TournamentStatus } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

import { TOURNAMENT_STATUS_KEYS } from './labels';

interface Tone {
  readonly bg: string;
  readonly fg: string;
  readonly dot: string;
}

/**
 * Тон пилюли по состоянию.
 *
 * Смысл несёт подпись, цвет помогает глазу пробежать календарь (запрет №6:
 * цвет не единственный носитель). Выделены состояния, ради которых календарь
 * и открывают: «идёт сейчас» — красным, «можно записаться» — зелёным.
 * Прошедшие приглушены и не спорят с ближайшими.
 */
const TONE: Readonly<Record<TournamentStatus, Tone>> = {
  DRAFT: { bg: 'var(--warn-50)', fg: 'var(--warn-text)', dot: 'var(--warn)' },
  PUBLISHED: { bg: 'var(--ink-100)', fg: 'var(--ink-700)', dot: 'var(--ink-500)' },
  REG_OPEN: { bg: 'var(--ok-50)', fg: 'var(--ok-text)', dot: 'var(--ok)' },
  REG_CLOSED: { bg: 'var(--ink-100)', fg: 'var(--ink-700)', dot: 'var(--ink-500)' },
  RUNNING: { bg: 'var(--red-50)', fg: 'var(--red-700)', dot: 'var(--red-600)' },
  FINISHED: { bg: 'var(--ink-100)', fg: 'var(--ink-700)', dot: 'var(--ink-400)' },
  RATED: { bg: 'var(--ink-100)', fg: 'var(--ink-700)', dot: 'var(--ink-400)' },
  CANCELLED: { bg: 'transparent', fg: 'var(--ink-500)', dot: 'var(--ink-300)' },
};

/** Состояние турнира — docs/07-design-system.md, 5.2, `TournamentStatusBadge`. */
export default function StatusBadge({ status }: { readonly status: TournamentStatus }): ReactNode {
  const t = useT();
  const tone = TONE[status];

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        height: 24,
        px: 1.25,
        borderRadius: 999,
        bgcolor: tone.bg,
        color: tone.fg,
        border: status === 'CANCELLED' ? '1px solid var(--line-strong)' : 'none',
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      <Box
        component="span"
        aria-hidden
        // Точка не пульсирует: состояние называет подпись, а мигание
        // рядом с ней изображало бы живость, которой в списке нет.
        sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: tone.dot }}
      />
      {t(TOURNAMENT_STATUS_KEYS[status])}
    </Box>
  );
}
