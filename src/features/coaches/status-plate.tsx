import type { CoachView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

import { coachStatusText, coachStatusTone } from './status';

const TONES = {
  ok: { bg: 'var(--ok-50)', border: 'var(--ok)', text: 'var(--ok-text)' },
  neutral: { bg: 'var(--paper)', border: 'var(--line)', text: 'var(--ink-900)' },
  warn: { bg: 'var(--warn-50)', border: 'var(--warn)', text: 'var(--warn-text)' },
} as const;

/**
 * Плашка статуса страницы тренера — сверху кабинета и на самой странице
 * для владельца и администратора (`docs/11` 5.4). Статус написан словом,
 * подложка лишь помогает заметить отказ и скрытие (07, 9).
 */
export default function CoachStatusPlate({
  coach,
  hint,
  children,
}: {
  readonly coach: Pick<CoachView, 'status' | 'rejectReason' | 'hidden' | 'hiddenReason'>;
  /** Пояснение под статусом: что видят другие, что делать дальше. */
  readonly hint?: ReactNode;
  /** Действия справа: «Править», «Отправить на проверку», «Открыть страницу». */
  readonly children?: ReactNode;
}): ReactNode {
  const t = useT();
  const tone = TONES[coachStatusTone(coach)];

  return (
    <Paper
      variant="outlined"
      role="status"
      data-coach-status={coach.hidden ? 'HIDDEN' : coach.status}
      sx={{
        p: { xs: 2, sm: 2.5 },
        bgcolor: tone.bg,
        borderColor: tone.border,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
      }}
    >
      <Box sx={{ minWidth: 0, maxWidth: 680 }}>
        <Typography variant="h3" component="p" sx={{ color: tone.text, overflowWrap: 'anywhere' }}>
          {coachStatusText(coach, t)}
        </Typography>
        {hint !== undefined && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {hint}
          </Typography>
        )}
      </Box>
      {children !== undefined && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
          {children}
        </Box>
      )}
    </Paper>
  );
}
