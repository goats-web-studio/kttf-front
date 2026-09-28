import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';

import ConsoleDialog, { DialogSection } from './console-dialog';
import MatchLine from './match-line';
import type { QueuedMatch, TableState } from './queue';

interface TableDialogProps {
  readonly table: TableState;
  readonly queue: readonly QueuedMatch[];
  readonly names: ReadonlyMap<string, string>;
  readonly onClose: () => void;
  /** Позвать пару из очереди на этот стол. */
  readonly onCall: (matchId: string) => void;
  /** Открыть только что сыгранную встречу — исправить счёт. */
  readonly onOpenMatch: (matchId: string) => void;
}

/**
 * Свободный стол: кого позвать — ТЗ 6.2.
 *
 * Обратный путь к назначению из очереди. Судья смотрит в зал, видит, что
 * со стола ушли, касается стола на экране — и выбирает пару. Порядок тот же,
 * что в очереди: первым тот, кто дольше ждёт, подсказки ТЗ 6.3 рядом.
 *
 * Если на столе лежит закрытая встреча, она показана сверху: судья только
 * что ввёл счёт и, заметив ошибку, исправит её отсюда же.
 */
const SHOWN = 8;

export default function TableDialog({
  table,
  queue,
  names,
  onClose,
  onCall,
  onOpenMatch,
}: TableDialogProps): ReactNode {
  const t = useT();
  const last = table.status === 'AWAITING' ? table.match : null;

  return (
    <ConsoleDialog
      caption={table.status === 'AWAITING' ? t('console.table.awaiting') : t('console.table.free')}
      title={fill(t('console.dialog.table'), { number: String(table.number) })}
      onClose={onClose}
    >
      {last !== null && (
        <DialogSection title={t('console.dialog.lastResult')}>
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <MatchLine match={last} names={names} />
            <Button
              variant="text"
              onClick={() => {
                onOpenMatch(last.id);
              }}
              sx={{ mt: 0.5, minHeight: 48, px: 0, color: 'text.secondary' }}
            >
              {t('console.dialog.editResult')}
            </Button>
          </Paper>
        </DialogSection>
      )}

      <DialogSection title={t('console.dialog.callNext')}>
        {queue.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('console.dialog.queueEmpty')}
          </Typography>
        ) : (
          <Stack component="ol" spacing={1} sx={{ m: 0, p: 0, listStyle: 'none' }}>
            {queue.slice(0, SHOWN).map((item, index) => (
              <Paper key={item.match.id} component="li" variant="outlined">
                <ButtonBase
                  // Игрок ещё за другим столом — звать пару нельзя.
                  disabled={item.busyTable !== null}
                  onClick={() => {
                    onCall(item.match.id);
                  }}
                  sx={{
                    display: 'block',
                    width: '100%',
                    minHeight: 64,
                    p: 1.5,
                    textAlign: 'left',
                    borderRadius: 1,
                    typography: 'body1',
                    '&.Mui-disabled': { opacity: 0.6 },
                  }}
                >
                  <Typography component="span" variant="caption" color="text.secondary">
                    {item.label}
                  </Typography>
                  <MatchLine match={item.match} names={names} />
                  {item.busyTable === null ? (
                    <Hints first={index === 0} lastForBoth={item.lastForBoth} />
                  ) : (
                    <Typography component="span" variant="caption" color="warning.main">
                      {fill(t('console.queue.busy'), { number: String(item.busyTable) })}
                    </Typography>
                  )}
                </ButtonBase>
              </Paper>
            ))}
          </Stack>
        )}
      </DialogSection>
    </ConsoleDialog>
  );
}

/** Подсказки ТЗ 6.3: судья решает, кого звать, по ним. */
export function Hints({
  first,
  lastForBoth,
}: {
  readonly first: boolean;
  readonly lastForBoth: boolean;
}): ReactNode {
  const t = useT();

  if (!first && !lastForBoth) {
    return null;
  }

  return (
    <Box component="span" sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {first && (
        <Chip
          component="span"
          size="small"
          variant="outlined"
          color="warning"
          label={t('console.hint.waiting')}
        />
      )}
      {lastForBoth && (
        <Chip
          component="span"
          size="small"
          variant="outlined"
          label={t('console.hint.lastForBoth')}
        />
      )}
    </Box>
  );
}
