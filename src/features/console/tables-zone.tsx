import type { MatchView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';

import type { TableState } from './queue';
import { minutesSince } from './use-now';

interface TablesZoneProps {
  readonly tables: readonly TableState[];
  readonly names: ReadonlyMap<string, string>;
  readonly now: number;
  readonly onOpen: (table: TableState) => void;
}

/** Встреча на столе дольше этого — повод судье подойти и посмотреть. */
const LONG_MATCH_MINUTES = 30;

/**
 * Зона столов — ТЗ 6.1. Главный экран судьи.
 *
 * Каждый стол — кнопка. Касание идущего стола открывает ввод счёта,
 * касание свободного — выбор пары из очереди. Так судья работает от зала,
 * который видит глазами: «на третьем доиграли» → касание третьего → счёт.
 *
 * Три состояния, а не два: свободен, идёт встреча, встреча закрыта и ждёт,
 * когда за стол сядут следующие. Третье существует потому, что счёт вводится
 * раньше, чем игроки уходят от стола.
 */
export default function TablesZone({ tables, names, now, onOpen }: TablesZoneProps): ReactNode {
  const t = useT();

  return (
    <section>
      <Typography
        component="h2"
        variant="subtitle2"
        color="text.secondary"
        sx={{ fontWeight: 600 }}
      >
        {t('console.tables.title')}
      </Typography>
      <Box
        component="ul"
        sx={{
          mt: 1,
          p: 0,
          listStyle: 'none',
          display: 'grid',
          gap: 1,
          gridTemplateColumns: 'repeat(auto-fill, minmax(156px, 1fr))',
        }}
      >
        {tables.map((table) => (
          <Paper
            key={table.number}
            component="li"
            variant="outlined"
            // Идущий матч маркируется красным — принцип 1.3 дизайн-системы.
            // Состояние при этом всегда написано словом рядом: цвет здесь
            // второй носитель смысла, а не единственный (запрет №6).
            sx={{
              display: 'flex',
              borderWidth: table.status === 'PLAYING' ? 2 : 1,
              borderColor:
                table.status === 'PLAYING'
                  ? 'primary.main'
                  : table.status === 'AWAITING'
                    ? 'warning.main'
                    : 'divider',
              bgcolor: table.status === 'FREE' ? 'background.default' : 'background.paper',
            }}
          >
            <ButtonBase
              onClick={() => {
                onOpen(table);
              }}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                justifyContent: 'flex-start',
                width: '100%',
                minHeight: 112,
                p: 1.5,
                textAlign: 'left',
                borderRadius: 1,
              }}
            >
              <Box
                component="span"
                sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}
              >
                <Box
                  component="span"
                  sx={{
                    fontFamily: "'Oswald', system-ui, sans-serif",
                    fontSize: 30,
                    lineHeight: '32px',
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {table.number}
                </Box>
                <Status table={table} now={now} />
              </Box>

              {table.match === null ? (
                <Typography
                  component="span"
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 'auto', pt: 1 }}
                >
                  {t('console.table.call')}
                </Typography>
              ) : (
                <Pair match={table.match} names={names} />
              )}
            </ButtonBase>
          </Paper>
        ))}
      </Box>
    </section>
  );
}

function Status({ table, now }: { readonly table: TableState; readonly now: number }): ReactNode {
  const t = useT();

  if (table.status === 'PLAYING') {
    const minutes = minutesSince(table.match?.startedAt ?? null, now);

    return (
      <Typography
        component="span"
        variant="caption"
        sx={{
          fontVariantNumeric: 'tabular-nums',
          color:
            minutes !== null && minutes >= LONG_MATCH_MINUTES ? 'warning.main' : 'primary.main',
          fontWeight: 600,
        }}
      >
        {minutes === null
          ? t('console.table.busy')
          : fill(t('console.table.minutes'), { minutes: String(minutes) })}
      </Typography>
    );
  }

  return (
    <Typography component="span" variant="caption" color="text.secondary">
      {table.status === 'AWAITING' ? t('console.table.awaiting') : t('console.table.free')}
    </Typography>
  );
}

/**
 * Пара столбиком: фамилия на строку. На карточке шириной в полтелефона
 * «Иванов — Петров» в одну строку не помещается и обрывается посередине.
 */
function Pair({
  match,
  names,
}: {
  readonly match: MatchView;
  readonly names: ReadonlyMap<string, string>;
}): ReactNode {
  const t = useT();
  const played = match.setsA !== null && match.setsB !== null;

  return (
    <Box component="span" sx={{ mt: 1, display: 'grid', gap: 0.25 }}>
      {(['A', 'B'] as const).map((side) => {
        const id = side === 'A' ? match.playerAId : match.playerBId;
        const sets = side === 'A' ? match.setsA : match.setsB;
        const other = side === 'A' ? match.setsB : match.setsA;
        const won = played && (sets ?? 0) > (other ?? 0);

        return (
          <Box
            key={side}
            component="span"
            sx={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 1,
              typography: 'body2',
              ...(won ? { fontWeight: 600, color: 'primary.main' } : {}),
              ...(played && !won ? { color: 'text.secondary' } : {}),
            }}
          >
            <Box
              component="span"
              sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {id === null
                ? t('console.match.pending')
                : (names.get(id) ?? t('console.match.unknownPlayer'))}
            </Box>
            {played && (
              <Box
                component="span"
                sx={{
                  fontFamily: "'Oswald', system-ui, sans-serif",
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {sets}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
