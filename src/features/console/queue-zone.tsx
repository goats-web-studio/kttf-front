import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useState, type ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';

import MatchLine from './match-line';
import type { QueuedMatch } from './queue';

interface QueueZoneProps {
  readonly queue: readonly QueuedMatch[];
  readonly suggested: number | null;
  readonly names: ReadonlyMap<string, string>;
  /** Столы, где сейчас играют: пустая очередь ждёт именно их. */
  readonly playing?: readonly number[];
  readonly onAssign: (matchId: string, tableNumber: number) => void;
  /** Открыть встречу: выбрать другой стол или ввести счёт без стола. */
  readonly onOpen: (matchId: string) => void;
}

/** Сколько пар видно без раскрытия: судье нужны ближайшие, а не весь вечер. */
const SHOWN = 6;

/**
 * Зона «В ожидании» — ТЗ 6.1 и 6.2.
 *
 * Список строк в одной карточке, как панель «В ожидании» у турнир-менеджера
 * RTTF: этап и группа мелко, пара крупно, справа — «На стол N». Залитая
 * кнопка одна — у первой пары, которую и нужно звать; у остальных та же
 * кнопка текстом. Пара, где кто-то ещё за столом, приглушена и без кнопки.
 *
 * Касание самой строки открывает окно встречи: другой стол, счёт без стола.
 */
export default function QueueZone({
  queue,
  suggested,
  names,
  playing = [],
  onAssign,
  onOpen,
}: QueueZoneProps): ReactNode {
  const t = useT();
  const [all, setAll] = useState(false);
  const shown = all ? queue : queue.slice(0, SHOWN);

  return (
    <section>
      <Typography component="h2" variant="h3">
        {t('console.queue.title')}
        {queue.length > 0 && (
          <Box
            component="span"
            sx={{
              ml: 1,
              color: 'text.secondary',
              fontWeight: 500,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {queue.length}
          </Box>
        )}
      </Typography>

      {queue.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          {/* Пустая очередь посреди турнира — ожидание, а не остановка. */}
          {playing.length > 0
            ? fill(t('console.queue.after'), { list: playing.join(', ') })
            : t('console.queue.empty')}
        </Typography>
      ) : (
        <Paper variant="outlined" component="ol" sx={{ mt: 1.5, mb: 0, p: 0, listStyle: 'none' }}>
          {shown.map((item, index) => {
            const free = item.busyTable === null;
            const first = index === 0 && free;

            return (
              <Box
                key={item.match.id}
                component="li"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  pr: 1.5,
                  borderTop: index === 0 ? 0 : 1,
                  borderColor: 'divider',
                  opacity: free ? 1 : 0.6,
                }}
              >
                <ButtonBase
                  onClick={() => {
                    onOpen(item.match.id);
                  }}
                  sx={{
                    display: 'block',
                    flexGrow: 1,
                    minWidth: 0,
                    minHeight: 64,
                    px: 2,
                    py: 1.25,
                    textAlign: 'left',
                    typography: 'body1',
                  }}
                >
                  <Typography component="span" variant="caption" color="text.secondary">
                    {item.label}
                  </Typography>
                  <MatchLine match={item.match} names={names} />
                  <Note item={item} first={first} />
                </ButtonBase>

                {suggested !== null && free && (
                  <Button
                    size="large"
                    variant={first ? 'contained' : 'text'}
                    onClick={() => {
                      onAssign(item.match.id, suggested);
                    }}
                    sx={{
                      minHeight: 48,
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                      ...(first ? {} : { color: 'text.primary' }),
                    }}
                  >
                    {t('console.queue.assign')} {suggested}
                  </Button>
                )}
              </Box>
            );
          })}
        </Paper>
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
        <Typography variant="body2" color="text.secondary" component="p" sx={{ mt: 1 }}>
          {t('console.queue.noFreeTable')}
        </Typography>
      )}
    </section>
  );
}

/**
 * Подсказки ТЗ 6.3 — одной строкой мелко, а не плашками: судья решает по
 * ним, но они не должны спорить с фамилиями.
 */
function Note({ item, first }: { readonly item: QueuedMatch; readonly first: boolean }): ReactNode {
  const t = useT();

  const notes = [
    item.busyTable === null
      ? null
      : fill(t('console.queue.busy'), { number: String(item.busyTable) }),
    first ? t('console.hint.waiting') : null,
    item.lastForBoth ? t('console.hint.lastForBoth') : null,
  ].filter((note) => note !== null);

  if (notes.length === 0) {
    return null;
  }

  return (
    <Typography
      component="span"
      variant="caption"
      sx={{ display: 'block', mt: 0.25, color: 'var(--warn-text)', fontWeight: 500 }}
    >
      {notes.join(' · ')}
    </Typography>
  );
}
