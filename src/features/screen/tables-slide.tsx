import type { MatchView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';
import type { QueuedMatch, TableState } from '@/features/console/queue';

import FitName from './fit-name';
import { BOARD_TITLE, DISPLAY, TYPE, VISUALLY_HIDDEN } from './scale';
import { LONG_MINUTES, isCalling } from './wall-model';

/** Ширина колонки очереди и результатов справа. */
const SIDE = 600;
/** Ширина зоны столов: сцена без полей, колонки справа и зазора. */
const TABLES_WIDTH = 1856 - SIDE - 24;
const TABLES_HEIGHT = 772;
const GAP = 12;
const NUMBER = 88;

interface TablesSlideProps {
  readonly tables: readonly TableState[];
  readonly queue: readonly QueuedMatch[];
  readonly played: readonly MatchView[];
  readonly names: ReadonlyMap<string, string>;
  readonly labelOf: (match: MatchView) => string;
  readonly now: number;
  /** Все встречи закрыты: пустая очередь — конец, а не ожидание. */
  readonly done: boolean;
}

/**
 * Экран 1 — «где я играю и кто следующий» (ТЗ 6.5, ADR-082).
 *
 * Слева столы крупными плитками: номер, две фамилии, что происходит. Только
 * занятые: свободные — одной строкой внизу, десять пустых карточек залу
 * ничего не сообщают. Справа — очередь и последние результаты.
 *
 * Вызов (первые две минуты после назначения) — оранжевый номер: игрок,
 * отошедший за водой, находит свой стол по цвету и слову, не спрашивая судью.
 */
export default function TablesSlide({
  tables,
  queue,
  played,
  names,
  labelOf,
  now,
  done,
}: TablesSlideProps): ReactNode {
  const t = useT();
  const busy = tables.filter((table) => table.match !== null);
  const free = tables.filter((table) => table.match === null).map((table) => table.number);
  const columns = busy.length <= 10 ? 2 : busy.length <= 15 ? 3 : 4;
  const rows = Math.max(1, Math.ceil(busy.length / columns));
  const tileHeight = Math.min(168, Math.floor((TABLES_HEIGHT - (rows - 1) * GAP) / rows));
  const tileWidth = Math.floor((TABLES_WIDTH - (columns - 1) * GAP) / columns);
  const font = Math.min(
    columns === 2 ? TYPE.l : columns === 3 ? 26 : 22,
    Math.floor(tileHeight / 4.4),
  );

  return (
    <Box
      sx={{
        height: '100%',
        display: 'grid',
        gridTemplateColumns: `minmax(0, 1fr) ${String(SIDE)}px`,
        gap: '24px',
      }}
    >
      <Box component="section" aria-label={t('screen.now.title')} sx={{ minHeight: 0 }}>
        <Typography component="h2" sx={BOARD_TITLE}>
          {t('screen.now.title')}
        </Typography>

        <Box
          component="ul"
          sx={{
            m: 0,
            mt: '12px',
            p: 0,
            listStyle: 'none',
            display: 'grid',
            gap: `${String(GAP)}px`,
            gridTemplateColumns: `repeat(${String(columns)}, minmax(0, 1fr))`,
            gridAutoRows: `${String(tileHeight)}px`,
          }}
        >
          {busy.map((table) => (
            <Tile
              key={table.number}
              table={table}
              names={names}
              label={table.match === null ? '' : labelOf(table.match)}
              now={now}
              font={font}
              nameWidth={tileWidth - NUMBER - 32 - 44}
            />
          ))}
        </Box>

        {free.length > 0 && (
          <Box
            sx={{ mt: '16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}
          >
            {/* Чтецу экрана — фраза целиком, глазу — пилюли. */}
            <Box component="span" sx={VISUALLY_HIDDEN}>
              {fill(t('screen.free'), { list: free.join(', ') })}
            </Box>
            <Typography
              component="span"
              aria-hidden
              sx={{ fontSize: TYPE.s, color: 'text.secondary', mr: '4px' }}
            >
              {t('screen.free.label')}
            </Typography>
            {free.map((number) => (
              <FreePill key={number} number={number} />
            ))}
          </Box>
        )}
      </Box>

      <Box
        sx={{
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          overflow: 'hidden',
        }}
      >
        <QueueList queue={queue} names={names} shown={6} tables={tables} done={done} />
        <RecentList matches={played} names={names} labelOf={labelOf} shown={3} />
      </Box>
    </Box>
  );
}

export function FreePill({ number }: { readonly number: number }): ReactNode {
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        px: '14px',
        borderRadius: 999,
        bgcolor: 'var(--ok-50)',
        color: 'var(--ok-text)',
        fontFamily: DISPLAY,
        fontWeight: 700,
        fontSize: TYPE.s,
        lineHeight: '36px',
      }}
    >
      {number}
    </Box>
  );
}

function Tile({
  table,
  names,
  label,
  now,
  font,
  nameWidth,
}: {
  readonly table: TableState;
  readonly names: ReadonlyMap<string, string>;
  readonly label: string;
  readonly now: number;
  readonly font: number;
  readonly nameWidth: number;
}): ReactNode {
  const t = useT();
  const match = table.match;

  if (match === null) {
    return null;
  }

  const calling = isCalling(table, now);
  const minutes =
    match.startedAt === null
      ? null
      : Math.max(0, Math.floor((now - Date.parse(match.startedAt)) / 60_000));
  const status =
    table.status === 'AWAITING'
      ? t('screen.table.finished')
      : calling
        ? t('screen.call')
        : minutes === null || minutes >= LONG_MINUTES
          ? t('screen.match.long')
          : fill(t('screen.minutes'), { minutes: String(minutes) });

  return (
    <Box
      component="li"
      sx={{
        display: 'grid',
        gridTemplateColumns: `${String(NUMBER)}px minmax(0, 1fr)`,
        borderRadius: '12px',
        overflow: 'hidden',
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        // Выделяется только вызов — ради него игрок и смотрит на стену.
        ...(calling
          ? { boxShadow: 'inset 0 0 0 3px var(--warn)', borderColor: 'var(--warn)' }
          : {}),
      }}
    >
      <Box
        sx={{
          display: 'grid',
          placeItems: 'center',
          fontFamily: DISPLAY,
          fontSize: Math.round(font * 1.9),
          fontWeight: 700,
          ...(calling
            ? { bgcolor: 'var(--warn)', color: '#ffffff' }
            : { bgcolor: 'var(--paper-sunken)', color: 'text.primary' }),
        }}
      >
        {table.number}
      </Box>

      <Box
        sx={{
          minWidth: 0,
          px: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '12px',
            fontSize: TYPE.xs,
            lineHeight: 1.4,
            whiteSpace: 'nowrap',
          }}
        >
          <Box
            component="span"
            sx={{ color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {label}
          </Box>
          <Box
            component="span"
            sx={{
              flexShrink: 0,
              fontWeight: 700,
              color: calling
                ? 'var(--warn-text)'
                : table.status === 'AWAITING'
                  ? 'var(--ok-text)'
                  : 'text.primary',
            }}
          >
            {status}
          </Box>
        </Box>
        <Side match={match} side="A" names={names} font={font} width={nameWidth} />
        <Side match={match} side="B" names={names} font={font} width={nameWidth} />
      </Box>
    </Box>
  );
}

function Side({
  match,
  side,
  names,
  font,
  width,
}: {
  readonly match: MatchView;
  readonly side: 'A' | 'B';
  readonly names: ReadonlyMap<string, string>;
  readonly font: number;
  readonly width: number;
}): ReactNode {
  const t = useT();
  const id = side === 'A' ? match.playerAId : match.playerBId;
  const sets = side === 'A' ? match.setsA : match.setsB;
  const other = side === 'A' ? match.setsB : match.setsA;
  const played = sets !== null && other !== null;
  const won = played && sets > other;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: '12px',
        fontSize: font,
        lineHeight: 1.22,
        ...(won
          ? { fontWeight: 700, color: 'primary.main' }
          : played
            ? { color: 'text.secondary' }
            : { fontWeight: 600 }),
      }}
    >
      <Box component="span" sx={{ minWidth: 0 }}>
        <FitName
          text={
            id === null ? t('screen.match.pending') : (names.get(id) ?? t('screen.match.pending'))
          }
          width={width}
          font={font}
        />
      </Box>
      {sets !== null && (
        <Box component="span" sx={{ flexShrink: 0, fontFamily: DISPLAY, fontWeight: 700 }}>
          {sets}
        </Box>
      )}
    </Box>
  );
}

/** «Кто следующий»: первая свободная пара — золотом, ждущие — серым с причиной. */
export function QueueList({
  queue,
  names,
  shown,
  tables,
  done,
}: {
  readonly queue: readonly QueuedMatch[];
  readonly names: ReadonlyMap<string, string>;
  readonly shown: number;
  readonly tables: readonly TableState[];
  readonly done: boolean;
}): ReactNode {
  const t = useT();
  const name = (id: string | null): string =>
    id === null ? t('screen.match.pending') : (names.get(id) ?? t('screen.match.pending'));
  const playing = tables.filter((table) => table.status === 'PLAYING').map((table) => table.number);

  return (
    <Box component="section" aria-label={t('screen.queue.title')} sx={{ flexShrink: 0 }}>
      <Typography component="h2" sx={BOARD_TITLE}>
        {t('screen.next.title')}
        {queue.length > shown && (
          <Box
            component="span"
            sx={{ fontSize: TYPE.xs, fontWeight: 500, color: 'text.secondary' }}
          >
            {fill(t('screen.queue.more'), { count: String(queue.length - shown) })}
          </Box>
        )}
      </Typography>

      {queue.length === 0 ? (
        // Пустая очередь посреди турнира — это ожидание, а не остановка:
        // «Очередь пуста» при 25 из 29 читалось как «турнир встал».
        <Typography sx={{ mt: '12px', fontSize: TYPE.s, color: 'text.secondary', lineHeight: 1.4 }}>
          {done || playing.length === 0
            ? t('screen.queue.done')
            : fill(t('screen.queue.after'), { list: playing.join(', ') })}
        </Typography>
      ) : (
        <Box
          component="ol"
          sx={{ m: 0, mt: '12px', p: 0, listStyle: 'none', display: 'grid', gap: '8px' }}
        >
          {queue.slice(0, shown).map((item, index) => {
            const first = index === 0 && item.busyTable === null;
            const waiting = item.busyTable !== null;

            return (
              <Box
                key={item.match.id}
                component="li"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '40px minmax(0, 1fr)',
                  alignItems: 'center',
                  gap: '8px',
                  px: '14px',
                  py: '8px',
                  borderRadius: '12px',
                  border: 1,
                  borderColor: first ? 'var(--gold)' : 'divider',
                  bgcolor: first ? 'var(--gold-50)' : 'background.paper',
                }}
              >
                <Box
                  component="span"
                  sx={{
                    fontFamily: DISPLAY,
                    fontWeight: 700,
                    fontSize: TYPE.m,
                    textAlign: 'center',
                    color: first ? 'var(--gold-text)' : 'text.secondary',
                  }}
                >
                  {index + 1}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Box
                    sx={{
                      fontSize: TYPE.s,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      color: waiting ? 'text.secondary' : 'text.primary',
                    }}
                  >
                    {name(item.match.playerAId)} — {name(item.match.playerBId)}
                  </Box>
                  <Box
                    sx={{
                      fontSize: TYPE.xs,
                      color: 'text.secondary',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                    }}
                  >
                    {waiting
                      ? `${item.label} · ${fill(t('screen.busy'), { number: String(item.busyTable) })}`
                      : item.label}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

function RecentList({
  matches,
  names,
  labelOf,
  shown,
}: {
  readonly matches: readonly MatchView[];
  readonly names: ReadonlyMap<string, string>;
  readonly labelOf: (match: MatchView) => string;
  readonly shown: number;
}): ReactNode {
  const t = useT();
  const name = (id: string | null): string =>
    id === null ? t('screen.match.pending') : (names.get(id) ?? t('screen.match.pending'));

  return (
    <Box component="section" aria-label={t('screen.recent.title')} sx={{ minHeight: 0 }}>
      <Typography component="h2" sx={BOARD_TITLE}>
        {t('screen.recent.title')}
      </Typography>
      {matches.length === 0 ? (
        <Typography sx={{ mt: '12px', fontSize: TYPE.s, color: 'text.secondary' }}>
          {t('screen.recent.empty')}
        </Typography>
      ) : (
        <Box
          component="ol"
          sx={{ m: 0, mt: '12px', p: 0, listStyle: 'none', display: 'grid', gap: '8px' }}
        >
          {matches.slice(0, shown).map((match) => {
            const aWon = (match.setsA ?? 0) > (match.setsB ?? 0);

            return (
              <Box
                key={match.id}
                component="li"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto',
                  alignItems: 'center',
                  gap: '12px',
                  px: '14px',
                  py: '8px',
                  borderRadius: '12px',
                  border: 1,
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Box sx={{ fontSize: TYPE.s, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    <Box
                      component="span"
                      sx={aWon ? { fontWeight: 700, color: 'primary.main' } : {}}
                    >
                      {name(match.playerAId)}
                    </Box>
                    {' — '}
                    <Box
                      component="span"
                      sx={aWon ? {} : { fontWeight: 700, color: 'primary.main' }}
                    >
                      {name(match.playerBId)}
                    </Box>
                  </Box>
                  <Box sx={{ fontSize: TYPE.xs, color: 'text.secondary' }}>{labelOf(match)}</Box>
                </Box>
                <Box
                  component="span"
                  sx={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: TYPE.m }}
                >
                  {match.setsA}:{match.setsB}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
