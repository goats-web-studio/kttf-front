import type { MatchView, StageView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';

import { DISPLAY, size, tint } from './scale';

interface BracketBoardProps {
  readonly stage: StageView;
  readonly names: ReadonlyMap<string, string>;
}

/**
 * Сетка плей-офф на стене — ТЗ 6.5.
 *
 * Круги колонками слева направо, встречи в колонке разнесены по высоте так,
 * что пара следующего круга стоит между своими источниками, — привычная
 * турнирная сетка. Идущая встреча в зелёной рамке, победитель красным.
 *
 * Встреча, чьи участники ещё не определились, показана пустыми строками:
 * сетка разворачивается целиком при жеребьёвке (ADR-019), и зритель видит,
 * сколько кругов впереди.
 */
export default function BracketBoard({ stage, names }: BracketBoardProps): ReactNode {
  const t = useT();
  const rounds = byRound(stage.matches);

  return (
    <Box
      sx={{
        height: '100%',
        minHeight: 0,
        display: 'grid',
        gap: '1vw',
        gridTemplateColumns: `repeat(${String(rounds.length)}, minmax(0, 1fr))`,
        gridTemplateRows: 'auto minmax(0, 1fr)',
      }}
    >
      {rounds.map(([round, matches]) => (
        <Typography
          key={`title-${String(round)}`}
          sx={{
            fontSize: size(0.85),
            fontWeight: 700,
            color: matches.length === 1 ? 'primary.main' : 'text.secondary',
          }}
        >
          {roundName(matches.length, t)}
        </Typography>
      ))}
      {rounds.map(([round, matches]) => (
        <Box
          key={round}
          sx={{
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-around',
            gap: '0.8vh',
          }}
        >
          {matches.map((match) => (
            <MatchBox key={match.id} match={match} names={names} />
          ))}
        </Box>
      ))}
    </Box>
  );
}

function byRound(matches: readonly MatchView[]): [number, MatchView[]][] {
  const rounds = new Map<number, MatchView[]>();

  for (const match of matches) {
    const round = match.bracketRound ?? 1;
    rounds.set(round, [...(rounds.get(round) ?? []), match]);
  }

  return [...rounds.entries()]
    .sort(([left], [right]) => left - right)
    .map(([round, list]) => [
      round,
      [...list].sort((left, right) => (left.bracketSlot ?? 0) - (right.bracketSlot ?? 0)),
    ]);
}

/** Название круга по числу встреч в нём: 1 — финал, 2 — полуфинал, дальше 1/n. */
function roundName(
  count: number,
  t: (key: 'screen.round.final' | 'screen.round.semi' | 'screen.round.of') => string,
): string {
  if (count <= 1) return t('screen.round.final');
  if (count === 2) return t('screen.round.semi');

  return fill(t('screen.round.of'), { n: String(count) });
}

function MatchBox({
  match,
  names,
}: {
  readonly match: MatchView;
  readonly names: ReadonlyMap<string, string>;
}): ReactNode {
  const playing = match.status === 'PLAYING';

  return (
    <Box
      sx={{
        borderRadius: 3,
        border: '0.12vw solid',
        borderColor: playing ? 'success.main' : 'divider',
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <Line match={match} side="A" names={names} />
      <Box sx={{ height: '1px', bgcolor: 'divider' }} />
      <Line match={match} side="B" names={names} />
    </Box>
  );
}

function Line({
  match,
  side,
  names,
}: {
  readonly match: MatchView;
  readonly side: 'A' | 'B';
  readonly names: ReadonlyMap<string, string>;
}): ReactNode {
  const id = side === 'A' ? match.playerAId : match.playerBId;
  const sets = side === 'A' ? match.setsA : match.setsB;
  const other = side === 'A' ? match.setsB : match.setsA;
  const won = sets !== null && other !== null && sets > other;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.5vw',
        px: '0.6vw',
        py: '0.35vh',
        fontSize: size(1),
        lineHeight: 1.3,
        bgcolor: won ? tint('red-600', 14) : 'transparent',
      }}
    >
      <Box
        component="span"
        sx={{
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          ...(id === null
            ? { color: 'text.disabled' }
            : won
              ? { fontWeight: 700, color: 'primary.main' }
              : {}),
        }}
      >
        {id === null ? '—' : (names.get(id) ?? '—')}
      </Box>
      {sets !== null && (
        <Box
          component="span"
          sx={{ fontFamily: DISPLAY, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
        >
          {sets}
        </Box>
      )}
    </Box>
  );
}
