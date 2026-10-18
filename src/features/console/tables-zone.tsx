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
  /** Этап и круг встречи — «Финал · Плей-офф»: ведущий объявляет по ней. */
  readonly labelOf?: (match: MatchView) => string;
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
 * Для судьи у стола два состояния: идёт встреча или свободен. Стол, где
 * счёт уже введён, а следующих ещё не позвали, — свободен: его и нужно
 * занимать. Только что сыгранная встреча остаётся на нём подписью, чтобы
 * было видно, кто здесь доиграл (раньше это было третье состояние «ждёт
 * освобождения», и оно сбивало: матч кончился, а стол «ждёт»).
 *
 * Карточка нарочно простая: номер, слово состояния, пара. Цвет один —
 * красная полоса у идущих встреч; свободный стол — просто белый.
 */
export default function TablesZone({
  tables,
  names,
  labelOf,
  now,
  onOpen,
}: TablesZoneProps): ReactNode {
  const t = useT();

  return (
    <section>
      <Typography component="h2" variant="h3">
        {t('console.tables.title')}
      </Typography>
      <Box
        component="ul"
        sx={{
          mt: 1.5,
          mb: 0,
          p: 0,
          listStyle: 'none',
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))',
        }}
      >
        {tables.map((table) => {
          const playing = table.status === 'PLAYING';

          return (
            <Paper
              key={table.number}
              component="li"
              variant="outlined"
              sx={{
                display: 'flex',
                borderRadius: 3,
                overflow: 'hidden',
                // Идущий матч маркируется красным — принцип 1.3 дизайн-системы.
                // Состояние при этом всегда написано словом рядом (запрет №6).
                borderLeft: playing ? '4px solid var(--red-600)' : undefined,
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
                  minHeight: 108,
                  p: 1.75,
                  textAlign: 'left',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Box
                  component="span"
                  sx={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: 1,
                  }}
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

                {playing && table.match !== null ? (
                  <>
                    {labelOf !== undefined && (
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        sx={{ mt: 0.75, display: 'block', fontWeight: 600 }}
                      >
                        {labelOf(table.match)}
                      </Typography>
                    )}
                    <Pair match={table.match} names={names} />
                  </>
                ) : table.match !== null ? (
                  <JustPlayed match={table.match} names={names} />
                ) : (
                  <Typography
                    component="span"
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 'auto', pt: 1 }}
                  >
                    {t('console.table.call')}
                  </Typography>
                )}
              </ButtonBase>
            </Paper>
          );
        })}
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
      <Typography
        component="span"
        variant="body2"
        sx={{
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          color: long ? 'var(--warn-text)' : 'primary.main',
        }}
      >
        {minutes === null
          ? t('console.table.busy')
          : fill(t('console.table.minutes'), { minutes: String(minutes) })}
      </Typography>
    );
  }

  return (
    <Typography component="span" variant="body2" sx={{ fontWeight: 600, color: 'var(--ok)' }}>
      {t('console.table.free')}
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

  return (
    <Box component="span" sx={{ mt: 1, display: 'grid', gap: 0.25 }}>
      {(['A', 'B'] as const).map((side) => {
        const id = side === 'A' ? match.playerAId : match.playerBId;

        return (
          <Box
            key={side}
            component="span"
            sx={{
              typography: 'body2',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {id === null
              ? t('console.match.pending')
              : (names.get(id) ?? t('console.match.unknownPlayer'))}
          </Box>
        );
      })}
    </Box>
  );
}

/** Что сыграли на столе последним — подписью, приглушённо. */
function JustPlayed({
  match,
  names,
}: {
  readonly match: MatchView;
  readonly names: ReadonlyMap<string, string>;
}): ReactNode {
  const t = useT();
  const name = (id: string | null): string =>
    id === null ? '' : (names.get(id) ?? t('console.match.unknownPlayer'));

  return (
    <Typography
      component="span"
      variant="caption"
      color="text.secondary"
      sx={{ mt: 'auto', pt: 1, display: 'block' }}
    >
      {t('console.table.justPlayed')}: {name(match.playerAId)} — {name(match.playerBId)}
      {match.setsA !== null && match.setsB !== null && (
        <Box component="span" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {' '}
          {match.setsA}:{match.setsB}
        </Box>
      )}
    </Typography>
  );
}
