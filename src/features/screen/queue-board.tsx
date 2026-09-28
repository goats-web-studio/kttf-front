import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import type { QueuedMatch } from '@/features/console/queue';

import { DISPLAY, size } from './scale';

interface QueueBoardProps {
  readonly queue: readonly QueuedMatch[];
  readonly names: ReadonlyMap<string, string>;
  /** Сколько встреч показывать: без таблиц рядом места под очередь больше. */
  readonly shown: number;
}

/**
 * Очередь ближайших встреч — ТЗ 6.5.
 *
 * Порядок тот же, что у судьи в консоли, и считается тем же `buildQueue`:
 * игрок, увидевший себя третьим на стене, не должен обнаружить у судьи другой
 * порядок. Второе правило очереди на клиенте — верный способ поссорить зал.
 *
 * Номер в очереди крупно слева: игроку важно «я следующий» или «через
 * две пары», и это читается раньше фамилий.
 */
export default function QueueBoard({ queue, names, shown }: QueueBoardProps): ReactNode {
  const t = useT();
  const rest = queue.length - shown;

  return (
    <Box component="section" aria-label={t('screen.queue.title')}>
      <Typography component="h2" color="text.secondary" sx={TITLE}>
        {t('screen.queue.title')}
      </Typography>

      {queue.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: '0.8vh', fontSize: size(1.3) }}>
          {t('screen.queue.empty')}
        </Typography>
      ) : (
        <Box
          component="ol"
          sx={{ m: 0, mt: '0.8vh', p: 0, listStyle: 'none', display: 'grid', gap: '0.6vh' }}
        >
          {queue.slice(0, shown).map((item, index) => (
            <Box
              key={item.match.id}
              component="li"
              sx={{
                display: 'grid',
                gridTemplateColumns: `${size(2.2)} minmax(0, 1fr)`,
                alignItems: 'center',
                gap: '0.8vw',
                px: '0.8vw',
                py: '0.6vh',
                borderRadius: 1,
                bgcolor: index === 0 ? 'background.paper' : 'transparent',
                border: 1,
                borderColor: index === 0 ? 'warning.main' : 'divider',
              }}
            >
              <Box
                component="span"
                sx={{
                  fontFamily: DISPLAY,
                  fontSize: size(1.6),
                  fontWeight: 700,
                  textAlign: 'center',
                  fontVariantNumeric: 'tabular-nums',
                  color: index === 0 ? 'warning.main' : 'text.secondary',
                }}
              >
                {index + 1}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  component="span"
                  color="text.secondary"
                  sx={{ display: 'block', fontSize: size(0.8), lineHeight: 1.3 }}
                >
                  {item.label}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    display: 'block',
                    fontSize: size(1.25),
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {name(item.match.playerAId, names, t('screen.match.pending'))}
                  <Box component="span" sx={{ px: '0.5vw', color: 'text.secondary' }}>
                    —
                  </Box>
                  {name(item.match.playerBId, names, t('screen.match.pending'))}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {rest > 0 && (
        <Typography color="text.secondary" sx={{ mt: '0.6vh', fontSize: size(0.9) }}>
          +{rest}
        </Typography>
      )}
    </Box>
  );
}

const TITLE = {
  fontSize: size(1.2),
  lineHeight: 1.2,
  fontWeight: 600,
} as const;

function name(id: string | null, names: ReadonlyMap<string, string>, fallback: string): string {
  return id === null ? fallback : (names.get(id) ?? fallback);
}
