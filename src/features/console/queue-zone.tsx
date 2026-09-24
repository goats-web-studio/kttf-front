import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState, type ReactNode } from 'react';

import { useT } from '@/common/i18n';

import MatchLine from './match-line';
import type { QueuedMatch, TableState } from './queue';

interface QueueZoneProps {
  readonly queue: readonly QueuedMatch[];
  readonly tables: readonly TableState[];
  readonly suggested: number | null;
  readonly names: ReadonlyMap<string, string>;
  readonly onAssign: (matchId: string, tableNumber: number) => void;
}

/**
 * Зона «В ожидании» — ТЗ 6.1 и 6.2.
 *
 * Порядок задан очередью: первым идёт тот, кто дольше не играл. Назначение —
 * в один тап на предложенный стол; выбор другого стола спрятан рядом, чтобы
 * не превращать обычный случай в два действия.
 */
export default function QueueZone({
  queue,
  tables,
  suggested,
  names,
  onAssign,
}: QueueZoneProps): ReactNode {
  const t = useT();

  return (
    <section>
      <Typography
        component="h2"
        variant="subtitle2"
        color="text.secondary"
        sx={{ fontWeight: 600 }}
      >
        {t('console.queue.title')}
      </Typography>

      {queue.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t('console.queue.empty')}
        </Typography>
      ) : (
        <Stack component="ul" spacing={1} sx={{ mt: 1, p: 0, listStyle: 'none' }}>
          {queue.map((item, index) => (
            <Paper
              key={item.match.id}
              component="li"
              variant="outlined"
              sx={{ p: 1.5, typography: 'body2' }}
            >
              <Typography variant="caption" color="text.secondary" component="p">
                {/* «Круговая · Круговая» — у круговой схемы единственная
                    группа названа как этап. Повторять незачем. */}
                {item.stageName}
                {item.groupLabel === null || item.groupLabel === item.stageName
                  ? ''
                  : ` · ${item.groupLabel}`}
              </Typography>
              <MatchLine match={item.match} names={names} />

              {(index === 0 || item.lastForBoth) && (
                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                  {/* Подсказки ТЗ 6.3: судья решает, кого звать, по ним. */}
                  {index === 0 && (
                    <Chip
                      size="small"
                      variant="outlined"
                      color="warning"
                      label={t('console.hint.waiting')}
                    />
                  )}
                  {item.lastForBoth && (
                    <Chip size="small" variant="outlined" label={t('console.hint.lastForBoth')} />
                  )}
                </Stack>
              )}

              <Assign
                tables={tables}
                suggested={suggested}
                onAssign={(tableNumber) => {
                  onAssign(item.match.id, tableNumber);
                }}
              />
            </Paper>
          ))}
        </Stack>
      )}
    </section>
  );
}

function Assign({
  tables,
  suggested,
  onAssign,
}: {
  readonly tables: readonly TableState[];
  readonly suggested: number | null;
  readonly onAssign: (tableNumber: number) => void;
}): ReactNode {
  const t = useT();
  const [choosing, setChoosing] = useState(false);

  if (suggested === null) {
    return (
      <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
        {t('console.queue.noFreeTable')}
      </Typography>
    );
  }

  return (
    <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
      <Button
        size="large"
        onClick={() => {
          onAssign(suggested);
        }}
        sx={{ minHeight: 56, fontWeight: 600 }}
      >
        {t('console.queue.assign')} {suggested}
      </Button>

      {choosing ? (
        // Номера столов кнопками, а не выпадающим списком: в зале это одно
        // касание пальцем, а не прокрутка крошечного меню.
        <Box
          role="group"
          aria-label={t('console.queue.otherTable')}
          sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}
        >
          {tables.map((table) => (
            <Button
              key={table.number}
              size="large"
              onClick={() => {
                setChoosing(false);
                onAssign(table.number);
              }}
              sx={{ minHeight: 56, minWidth: 56, fontVariantNumeric: 'tabular-nums' }}
            >
              {table.number}
            </Button>
          ))}
        </Box>
      ) : (
        <Button
          variant="text"
          size="large"
          onClick={() => {
            setChoosing(true);
          }}
          sx={{ minHeight: 56, color: 'text.secondary' }}
        >
          {t('console.queue.otherTable')}
        </Button>
      )}
    </Box>
  );
}
