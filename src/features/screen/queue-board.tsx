import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';
import type { QueuedMatch } from '@/features/console/queue';

import { BOARD_TITLE, DISPLAY, size } from './scale';

interface QueueBoardProps {
  readonly queue: readonly QueuedMatch[];
  readonly names: ReadonlyMap<string, string>;
  readonly shown: number;
}

/**
 * Кто играет следующим — ТЗ 6.5.
 *
 * Порядок тот же, что у судьи в консоли, и считается тем же `buildQueue`:
 * игрок, увидевший себя третьим на стене, не должен обнаружить у судьи другой
 * порядок. Пара, где кто-то ещё доигрывает, подписана: зал видит, почему её
 * не зовут.
 */
export default function QueueBoard({ queue, names, shown }: QueueBoardProps): ReactNode {
  const t = useT();
  const rest = queue.length - shown;

  return (
    <Box component="section" aria-label={t('screen.queue.title')} sx={{ flexShrink: 0 }}>
      <Typography component="h2" sx={BOARD_TITLE}>
        {t('screen.next.title')}
      </Typography>

      {queue.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: '0.8vh', fontSize: size(1.1) }}>
          {t('screen.queue.empty')}
        </Typography>
      ) : (
        <Box
          component="ol"
          sx={{ m: 0, mt: '0.8vh', p: 0, listStyle: 'none', display: 'grid', gap: '0.5vh' }}
        >
          {queue.slice(0, shown).map((item, index) => {
            const first = index === 0 && item.busyTable === null;

            return (
              <Box
                key={item.match.id}
                component="li"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: `${size(1.8)} minmax(0, 1fr)`,
                  alignItems: 'center',
                  gap: '0.6vw',
                  px: '0.6vw',
                  py: '0.4vh',
                  borderRadius: 3,
                  border: 1,
                  borderColor: first ? 'warning.main' : 'divider',
                  bgcolor: 'background.paper',
                  opacity: item.busyTable === null ? 1 : 0.7,
                }}
              >
                <Box
                  component="span"
                  sx={{
                    fontFamily: DISPLAY,
                    fontSize: size(1.4),
                    fontWeight: 700,
                    textAlign: 'center',
                    fontVariantNumeric: 'tabular-nums',
                    color: first ? 'warning.main' : 'text.secondary',
                  }}
                >
                  {index + 1}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    component="span"
                    sx={{
                      display: 'block',
                      fontSize: size(1.1),
                      lineHeight: 1.3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {name(item.match.playerAId, names, t('screen.match.pending'))}
                    <Box component="span" sx={{ px: '0.4vw', color: 'text.secondary' }}>
                      —
                    </Box>
                    {name(item.match.playerBId, names, t('screen.match.pending'))}
                  </Typography>
                  <Typography
                    component="span"
                    sx={{
                      display: 'block',
                      fontSize: size(0.7),
                      lineHeight: 1.3,
                      color: item.busyTable === null ? 'text.secondary' : 'warning.main',
                    }}
                  >
                    {item.busyTable === null
                      ? item.label
                      : `${item.label} · ${fill(t('screen.busy'), { number: String(item.busyTable) })}`}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {rest > 0 && (
        <Typography color="text.secondary" sx={{ mt: '0.4vh', fontSize: size(0.8) }}>
          +{rest}
        </Typography>
      )}
    </Box>
  );
}

function name(id: string | null, names: ReadonlyMap<string, string>, fallback: string): string {
  return id === null ? fallback : (names.get(id) ?? fallback);
}
