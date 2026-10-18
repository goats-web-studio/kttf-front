import type { GroupStandingsView, MatchView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

import { DISPLAY, size, tint } from './scale';

interface GroupBoardProps {
  readonly group: GroupStandingsView;
  readonly matches: readonly MatchView[];
  readonly names: ReadonlyMap<string, string>;
  readonly ratings: ReadonlyMap<string, string>;
  /** Сколько выходит из группы дальше. `null` — схема без выхода. */
  readonly advance: number | null;
}

/**
 * Группа на стене — таблица «каждый с каждым» (ТЗ 6.5, 6.6).
 *
 * Матрица, а не только очки: зритель видит, кто у кого выиграл и с кем
 * ещё не играл, — ровно то, о чём спорят у стены. Клетка победы зелёная,
 * поражения — красная, идущая прямо сейчас встреча помечена словом.
 * Зона выхода в плей-офф отчёркнута зелёной линейкой слева.
 *
 * Ни одно число не считается здесь: очки, разницы и места пришли от
 * сервера, посчитанные общим движком (запрет №2 брифа). Клетка матрицы —
 * это счёт встречи как он записан, а не расчёт.
 */
export default function GroupBoard({
  group,
  matches,
  names,
  ratings,
  advance,
}: GroupBoardProps): ReactNode {
  const t = useT();
  const order = group.rows.map((row) => row.participant);
  const columns = `${size(2)} minmax(0, 1fr) repeat(${String(order.length)}, ${size(2.9)}) ${size(2.6)} ${size(3.6)}`;

  return (
    <Box
      sx={{
        minHeight: 0,
        borderRadius: 4,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          px: '0.8vw',
          py: '0.6vh',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography
          component="h3"
          sx={{ fontFamily: DISPLAY, fontSize: size(1.5), fontWeight: 700, lineHeight: 1.2 }}
        >
          {group.label}
        </Typography>
        {advance !== null && (
          <Typography
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4vw',
              fontSize: size(0.75),
              color: 'success.main',
            }}
          >
            <Box
              component="span"
              sx={{ width: '0.3vw', height: '1em', borderRadius: 1, bgcolor: 'success.main' }}
            />
            {t('screen.group.advance')}
          </Typography>
        )}
      </Box>

      <Box role="table" aria-label={group.label} sx={{ fontVariantNumeric: 'tabular-nums' }}>
        <Box
          role="row"
          sx={{
            display: 'grid',
            gridTemplateColumns: columns,
            alignItems: 'center',
            px: '0.4vw',
            py: '0.3vh',
            fontSize: size(0.7),
            color: 'text.secondary',
          }}
        >
          <Box role="columnheader" sx={{ textAlign: 'center' }}>
            #
          </Box>
          <Box role="columnheader">{t('screen.standings.player')}</Box>
          {order.map((_participant, index) => (
            <Box key={index} role="columnheader" sx={{ textAlign: 'center' }}>
              {index + 1}
            </Box>
          ))}
          <Box role="columnheader" sx={{ textAlign: 'center' }}>
            {t('screen.standings.points')}
          </Box>
          <Box role="columnheader" sx={{ textAlign: 'center' }}>
            {t('screen.standings.sets')}
          </Box>
        </Box>

        {group.rows.map((row, index) => {
          const through = advance !== null && row.place !== null && row.place <= advance;

          return (
            <Box
              key={row.participant}
              role="row"
              sx={{
                display: 'grid',
                gridTemplateColumns: columns,
                alignItems: 'center',
                px: '0.4vw',
                py: '0.35vh',
                borderTop: 1,
                borderColor: 'divider',
                boxShadow: through ? 'inset 0.3vw 0 0 var(--ok)' : 'none',
                fontSize: size(1.15),
                lineHeight: 1.3,
              }}
            >
              <Box
                role="cell"
                sx={{
                  textAlign: 'center',
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                  color: through ? 'success.main' : 'text.secondary',
                }}
              >
                {row.place ?? '—'}
              </Box>
              <Box
                role="rowheader"
                sx={{
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                <Box component="span" sx={{ fontWeight: 600 }}>
                  {names.get(row.participant) ?? t('screen.match.pending')}
                </Box>
                <Box
                  component="span"
                  sx={{ ml: '0.4vw', fontSize: size(0.75), color: 'text.secondary' }}
                >
                  {ratings.get(row.participant) ?? ''}
                </Box>
              </Box>

              {order.map((opponent, column) => (
                <Cell
                  key={column}
                  self={column === index}
                  match={between(matches, row.participant, opponent)}
                  player={row.participant}
                />
              ))}

              <Box
                role="cell"
                sx={{
                  textAlign: 'center',
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                  fontSize: size(1.4),
                }}
              >
                {row.points}
              </Box>
              <Box role="cell" sx={{ textAlign: 'center', color: 'text.secondary' }}>
                {row.setsWon}:{row.setsLost}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function between(matches: readonly MatchView[], a: string, b: string): MatchView | undefined {
  return matches.find(
    (match) =>
      (match.playerAId === a && match.playerBId === b) ||
      (match.playerAId === b && match.playerBId === a),
  );
}

/** Клетка матрицы глазами игрока строки: его сеты слева. */
function Cell({
  self,
  match,
  player,
}: {
  readonly self: boolean;
  readonly match: MatchView | undefined;
  readonly player: string;
}): ReactNode {
  const t = useT();
  const base = {
    mx: '0.15vw',
    py: '0.15vh',
    borderRadius: 1,
    textAlign: 'center',
    fontSize: size(0.95),
    fontWeight: 600,
  } as const;

  if (self) {
    return <Box role="cell" sx={{ ...base, bgcolor: 'background.default', height: '100%' }} />;
  }

  if (match?.status === 'PLAYING') {
    return (
      <Box
        role="cell"
        // Идущая встреча — красная точка, а не плашка «идёт» в рамке: на
        // матрице их по нескольку, и рамки рябили сильнее результатов.
        aria-label={t('screen.group.playing')}
        sx={{ ...base, color: 'primary.main', fontSize: size(1.2), lineHeight: 1 }}
      >
        ●
      </Box>
    );
  }

  if (match?.setsA == null || match.setsB === null) {
    return (
      <Box role="cell" sx={{ ...base, color: 'text.disabled', fontWeight: 400 }}>
        ·
      </Box>
    );
  }

  const mine = match.playerAId === player ? match.setsA : match.setsB;
  const theirs = match.playerAId === player ? match.setsB : match.setsA;
  const won = mine > theirs;

  return (
    <Box
      role="cell"
      sx={{
        ...base,
        bgcolor: won ? tint('ok', 24) : tint('red-600', 18),
        color: won ? 'success.main' : 'primary.main',
      }}
    >
      {mine}:{theirs}
    </Box>
  );
}
