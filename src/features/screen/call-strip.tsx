import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';
import type { QueuedMatch, TableState } from '@/features/console/queue';

import { DISPLAY, TYPE, VISUALLY_HIDDEN } from './scale';
import { FreePill } from './tables-slide';
import { STRIP_HEIGHT, isCalling } from './wall-model';

/**
 * Полоса вызова под группами и сеткой — ADR-082.
 *
 * Экран столов показывается треть круга. Чтобы игрок, которого только что
 * позвали, не ждал его полминуты, свежие вызовы, следующая пара и свободные
 * столы остаются внизу на любом слайде.
 */
export default function CallStrip({
  tables,
  queue,
  names,
  now,
}: {
  readonly tables: readonly TableState[];
  readonly queue: readonly QueuedMatch[];
  readonly names: ReadonlyMap<string, string>;
  readonly now: number;
}): ReactNode {
  const t = useT();
  const name = (id: string | null): string =>
    id === null ? t('screen.match.pending') : (names.get(id) ?? t('screen.match.pending'));
  const calls = tables.filter((table) => isCalling(table, now));
  const next = queue.find((item) => item.busyTable === null);
  const free = tables.filter((table) => table.match === null).map((table) => table.number);

  return (
    <Box
      component="aside"
      aria-label={t('screen.call')}
      sx={{
        height: STRIP_HEIGHT,
        flexShrink: 0,
        display: 'grid',
        gridTemplateColumns: 'auto minmax(0, 1fr) auto',
        alignItems: 'center',
        gap: '24px',
        px: '20px',
        borderRadius: '12px',
        border: 1,
        borderColor: calls.length > 0 ? 'var(--warn)' : 'divider',
        bgcolor: 'background.paper',
        fontSize: TYPE.s,
      }}
    >
      <Box
        component="span"
        sx={{ fontWeight: 700, color: calls.length > 0 ? 'var(--warn-text)' : 'text.secondary' }}
      >
        {t('screen.call')}
      </Box>
      <Box
        sx={{ minWidth: 0, display: 'flex', gap: '32px', whiteSpace: 'nowrap', overflow: 'hidden' }}
      >
        {calls.length === 0 ? (
          <Box component="span" sx={{ color: 'text.secondary' }}>
            {t('screen.strip.none')}
          </Box>
        ) : (
          calls.map((table) => (
            <Box key={table.number} component="span" sx={{ fontWeight: 600 }}>
              <Box
                component="span"
                sx={{
                  mr: '10px',
                  px: '10px',
                  borderRadius: '6px',
                  bgcolor: 'var(--warn)',
                  color: '#ffffff',
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                }}
              >
                {table.number}
              </Box>
              {name(table.match?.playerAId ?? null)} — {name(table.match?.playerBId ?? null)}
            </Box>
          ))
        )}
        {next !== undefined && (
          <Box component="span" sx={{ color: 'text.secondary' }}>
            {t('screen.strip.next')}{' '}
            <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
              {name(next.match.playerAId)} — {name(next.match.playerBId)}
            </Box>
          </Box>
        )}
      </Box>
      {free.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Box component="span" sx={VISUALLY_HIDDEN}>
            {fill(t('screen.free'), { list: free.join(', ') })}
          </Box>
          <Box component="span" aria-hidden sx={{ color: 'text.secondary', mr: '4px' }}>
            {t('screen.free.label')}
          </Box>
          {free.slice(0, 8).map((number) => (
            <FreePill key={number} number={number} />
          ))}
        </Box>
      )}
    </Box>
  );
}
