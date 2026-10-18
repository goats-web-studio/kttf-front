import type { MatchView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { Plus } from 'lucide-react';
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
              position: 'relative',
              overflow: 'hidden',
              borderColor:
                table.status === 'PLAYING'
                  ? 'color-mix(in srgb, var(--night-red) 55%, var(--night-line))'
                  : table.status === 'AWAITING'
                    ? 'color-mix(in srgb, var(--night-warn) 55%, var(--night-line))'
                    : 'divider',
              // Подложка в цвет состояния: зал читается цветом раньше, чем
              // словами. Полоса сверху — тот же цвет, видный издалека.
              bgcolor:
                table.status === 'PLAYING'
                  ? 'color-mix(in srgb, var(--night-red) 12%, var(--night-raised))'
                  : table.status === 'AWAITING'
                    ? 'color-mix(in srgb, var(--night-warn) 10%, var(--night-raised))'
                    : 'background.paper',
              '&::before': {
                content: '""',
                position: 'absolute',
                insetInline: 0,
                top: 0,
                height: 4,
                bgcolor:
                  table.status === 'PLAYING'
                    ? 'var(--night-red)'
                    : table.status === 'AWAITING'
                      ? 'var(--night-warn)'
                      : 'var(--night-ok)',
                opacity: table.status === 'FREE' ? 0.5 : 1,
              },
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
                minHeight: 120,
                p: 2,
                pt: 2.25,
                textAlign: 'left',
                borderRadius: 4,
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
                    fontSize: 36,
                    lineHeight: '36px',
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {table.number}
                </Box>
                <Status table={table} now={now} />
              </Box>

              {table.match === null ? (
                // Свободный стол — приглашение позвать пару: действие, а не
                // пустота, поэтому набрано как кнопка внутри карточки.
                <Box
                  component="span"
                  sx={{
                    mt: 'auto',
                    pt: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    typography: 'body2',
                    fontWeight: 600,
                    color: 'var(--night-ink-900)',
                  }}
                >
                  <Plus size={16} aria-hidden />
                  {t('console.table.call')}
                </Box>
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

    const long = minutes !== null && minutes >= LONG_MATCH_MINUTES;

    return (
      <Pill tone={long ? 'var(--night-warn)' : 'var(--night-red)'}>
        {minutes === null
          ? t('console.table.busy')
          : fill(t('console.table.minutes'), { minutes: String(minutes) })}
      </Pill>
    );
  }

  return table.status === 'AWAITING' ? (
    <Pill tone="var(--night-warn)">{t('console.table.awaiting')}</Pill>
  ) : (
    <Pill tone="var(--night-ok)">{t('console.table.free')}</Pill>
  );
}

/** Состояние стола пилюлей: точка и слово цветом состояния на его подложке. */
function Pill({
  tone,
  children,
}: {
  readonly tone: string;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        height: 26,
        px: 1.25,
        borderRadius: 999,
        bgcolor: `color-mix(in srgb, ${tone} 16%, transparent)`,
        color: tone,
        fontSize: 13,
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
      }}
    >
      <Box
        component="span"
        aria-hidden
        sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: tone }}
      />
      {children}
    </Box>
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
                  minWidth: 26,
                  height: 26,
                  borderRadius: 1.5,
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: "'Oswald', system-ui, sans-serif",
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  ...(won
                    ? { bgcolor: 'var(--night-red)', color: 'var(--night)' }
                    : { bgcolor: 'var(--night-line)', color: 'var(--night-ink-700)' }),
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
