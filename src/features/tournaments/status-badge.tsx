import type { TournamentStatus } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

import { TOURNAMENT_STATUS_KEYS } from './labels';

/**
 * Цвет точки по состоянию.
 *
 * Смысл несёт подпись, точка только помогает глазу пробежать календарь
 * (запрет №6: цвет не единственный носитель). Выделены два состояния, ради
 * которых календарь и открывают: «можно записаться» и «идёт сейчас».
 * Остальные приглушены — прошедший турнир не должен спорить с ближайшим.
 */
const DOT: Readonly<Record<TournamentStatus, string>> = {
  DRAFT: 'var(--warn)',
  PUBLISHED: 'var(--ink-400)',
  REG_OPEN: 'var(--ok)',
  REG_CLOSED: 'var(--ink-400)',
  RUNNING: 'var(--red-600)',
  FINISHED: 'var(--ink-300)',
  RATED: 'var(--ink-300)',
  CANCELLED: 'var(--ink-300)',
};

const MUTED: ReadonlySet<TournamentStatus> = new Set(['FINISHED', 'RATED', 'CANCELLED']);

/** Состояние турнира — docs/07-design-system.md, 5.2, `TournamentStatusBadge`. */
export default function StatusBadge({ status }: { readonly status: TournamentStatus }): ReactNode {
  const t = useT();
  const muted = MUTED.has(status);

  return (
    <Chip
      size="small"
      variant="outlined"
      label={t(TOURNAMENT_STATUS_KEYS[status])}
      icon={
        <Box
          component="span"
          aria-hidden
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: DOT[status],
            ml: '8px !important',
          }}
        />
      }
      sx={{
        height: 24,
        fontSize: 12,
        borderColor: 'divider',
        color: muted ? 'text.disabled' : 'text.primary',
        fontWeight: muted ? 400 : 500,
      }}
    />
  );
}
