import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import type { QueuedMatch } from '@/features/console/queue';

interface QueueBoardProps {
  readonly queue: readonly QueuedMatch[];
  readonly names: ReadonlyMap<string, string>;
}

/**
 * Очередь ближайших встреч — ТЗ 6.5.
 *
 * Порядок тот же, что у судьи в консоли, и считается тем же `buildQueue`:
 * игрок, увидевший себя третьим на стене, не должен обнаружить у судьи другой
 * порядок. Второе правило очереди на клиенте — верный способ поссорить зал.
 *
 * Показываются первые шесть: экран висит на стене, а не листается.
 */
const SHOWN = 6;

export default function QueueBoard({ queue, names }: QueueBoardProps): ReactNode {
  const t = useT();

  return (
    <section>
      <Typography variant="h2" color="text.secondary" sx={BOARD_TITLE}>
        {t('screen.queue.title')}
      </Typography>

      {queue.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: 1.5, fontSize: 22, lineHeight: '28px' }}>
          {t('screen.queue.empty')}
        </Typography>
      ) : (
        <Stack component="ol" spacing={1} sx={{ mt: 1.5, p: 0, listStyle: 'none' }}>
          {queue.slice(0, SHOWN).map((item) => (
            <Paper
              key={item.match.id}
              component="li"
              variant="outlined"
              sx={{ p: 1.5, bgcolor: 'background.default' }}
            >
              <Typography variant="body2" color="text.secondary">
                {item.stageName}
                {item.groupLabel === null ? '' : ` · ${item.groupLabel}`}
              </Typography>
              <Typography sx={{ fontSize: 24, lineHeight: '32px' }}>
                {name(item.match.playerAId, names, t('screen.match.pending'))}
                <Box component="span" sx={{ px: 1.5, color: 'text.secondary' }}>
                  —
                </Box>
                {name(item.match.playerBId, names, t('screen.match.pending'))}
              </Typography>
            </Paper>
          ))}
        </Stack>
      )}
    </section>
  );
}

/** Заголовок доски: читается с десяти метров, но не спорит с данными. */
const BOARD_TITLE = {
  fontFamily: 'inherit',
  fontSize: 22,
  lineHeight: '28px',
  fontWeight: 600,
} as const;

function name(id: string | null, names: ReadonlyMap<string, string>, fallback: string): string {
  return id === null ? fallback : (names.get(id) ?? fallback);
}
