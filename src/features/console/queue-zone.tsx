import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState, type ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';

import MatchLine from './match-line';
import type { QueuedMatch } from './queue';
import { Hints } from './table-dialog';

interface QueueZoneProps {
  readonly queue: readonly QueuedMatch[];
  readonly suggested: number | null;
  readonly names: ReadonlyMap<string, string>;
  readonly onAssign: (matchId: string, tableNumber: number) => void;
  /** Открыть встречу: выбрать другой стол или ввести счёт без стола. */
  readonly onOpen: (matchId: string) => void;
}

/** Сколько пар видно без раскрытия: судье нужны ближайшие, а не весь вечер. */
const SHOWN = 5;

/**
 * Зона «В ожидании» — ТЗ 6.1 и 6.2.
 *
 * Порядок задан очередью: первым идёт тот, кто дольше не играл. Обычный
 * случай — одно касание: кнопка справа ставит пару на предложенный стол.
 * Всё остальное — другой стол, счёт без стола — в окне встречи, которое
 * открывается касанием самой строки.
 */
export default function QueueZone({
  queue,
  suggested,
  names,
  onAssign,
  onOpen,
}: QueueZoneProps): ReactNode {
  const t = useT();
  const [all, setAll] = useState(false);
  const shown = all ? queue : queue.slice(0, SHOWN);

  return (
    <section>
      <Typography
        component="h2"
        variant="subtitle2"
        color="text.secondary"
        sx={{ fontWeight: 600 }}
      >
        {t('console.queue.title')}
        {queue.length > 0 && (
          <Box
            component="span"
            sx={{
              ml: 1,
              px: 1,
              py: 0.25,
              borderRadius: 999,
              bgcolor: 'var(--night-line)',
              color: 'var(--night-ink-900)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {queue.length}
          </Box>
        )}
      </Typography>

      {queue.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t('console.queue.empty')}
        </Typography>
      ) : (
        <Stack component="ol" spacing={1} sx={{ mt: 1, p: 0, listStyle: 'none' }}>
          {shown.map((item, index) => (
            <Paper
              key={item.match.id}
              component="li"
              variant="outlined"
              sx={{
                display: 'flex',
                alignItems: 'stretch',
                position: 'relative',
                overflow: 'hidden',
                opacity: item.busyTable === null ? 1 : 0.75,
                // Первая в очереди — дольше всех ждёт: жёлтая полоса слева
                // и подпись словом (Hints), цвет не единственный носитель.
                ...(index === 0 && item.busyTable === null
                  ? {
                      borderColor: 'color-mix(in srgb, var(--night-warn) 55%, var(--night-line))',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        insetBlock: 0,
                        left: 0,
                        width: 4,
                        bgcolor: 'var(--night-warn)',
                      },
                    }
                  : {}),
              }}
            >
              <Box
                aria-hidden
                sx={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 48,
                  flexShrink: 0,
                  fontFamily: "'Oswald', system-ui, sans-serif",
                  fontSize: 22,
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  color: index === 0 ? 'var(--night-warn)' : 'var(--night-ink-500)',
                }}
              >
                {index + 1}
              </Box>
              <ButtonBase
                onClick={() => {
                  onOpen(item.match.id);
                }}
                sx={{
                  display: 'block',
                  flexGrow: 1,
                  minWidth: 0,
                  minHeight: 72,
                  py: 1.5,
                  pr: 1.5,
                  textAlign: 'left',
                  borderRadius: 1,
                  typography: 'body2',
                }}
              >
                <Typography component="span" variant="caption" color="text.secondary">
                  {item.label}
                </Typography>
                <MatchLine match={item.match} names={names} />
                {item.busyTable === null ? (
                  <Hints first={index === 0} lastForBoth={item.lastForBoth} />
                ) : (
                  <Typography
                    component="span"
                    variant="caption"
                    color="warning.main"
                    sx={{ display: 'block', mt: 0.5 }}
                  >
                    {fill(t('console.queue.busy'), { number: String(item.busyTable) })}
                  </Typography>
                )}
              </ButtonBase>

              {suggested !== null && item.busyTable === null && (
                <Box sx={{ display: 'flex', alignItems: 'center', pr: 1.5, flexShrink: 0 }}>
                  {/* Главное действие очереди — у первой пары: залитая
                      кнопка одна на экран (запрет №2). */}
                  <Button
                    size="large"
                    variant={index === 0 ? 'contained' : 'outlined'}
                    onClick={() => {
                      onAssign(item.match.id, suggested);
                    }}
                    sx={{ minHeight: 56, minWidth: 128, fontWeight: 700, whiteSpace: 'nowrap' }}
                  >
                    {t('console.queue.assign')} {suggested}
                  </Button>
                </Box>
              )}
            </Paper>
          ))}
        </Stack>
      )}

      {!all && queue.length > SHOWN && (
        <Button
          variant="text"
          onClick={() => {
            setAll(true);
          }}
          sx={{ mt: 1, minHeight: 44, color: 'text.secondary' }}
        >
          {t('console.queue.all')} ({queue.length})
        </Button>
      )}

      {queue.length > 0 && suggested === null && (
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
          {t('console.queue.noFreeTable')}
        </Typography>
      )}
    </section>
  );
}
