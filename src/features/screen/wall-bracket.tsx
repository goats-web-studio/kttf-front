import type { MatchView, StageView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';
import { isPlacement, roundName } from '@/common/ui/bracket-model';

import FitName from './fit-name';
import { DISPLAY } from './scale';
import {
  BOX,
  CAPTION,
  FONT,
  GAP_Y,
  PLACEMENT_CAPTION,
  PLACEMENT_GAP,
  ROW,
  bracketGeometry,
} from './wall-model';

interface Placed {
  readonly match: MatchView;
  readonly x: number;
  readonly y: number;
}

/**
 * Сетка на стене — ТЗ 6.5.
 *
 * Своя раскладка, а не общая `Bracket`: на стене сетка обязана поместиться
 * вся, без прокрутки, — финал и матч за 3-е место раньше уезжали за край.
 * Круги называются теми же правилами (`roundName`, `isPlacement`), что на
 * сайте: своё название кругов у стены однажды уже путало финал с полуфиналом.
 *
 * Рядом с фамилией — рейтинг (на форуме RTTF жалуются, что его в сетке
 * нет), у идущей встречи — номер стола.
 */
export default function WallBracket({
  stage,
  names,
  ratings,
  width,
  height,
}: {
  readonly stage: StageView;
  readonly names: ReadonlyMap<string, string>;
  readonly ratings: ReadonlyMap<string, string>;
  /** Область на сцене. */
  readonly width: number;
  readonly height: number;
}): ReactNode {
  const t = useT();
  const main = stage.matches.filter((match) => !isPlacement(match));
  const placement = stage.matches.filter(isPlacement);
  const rounds = [...new Set(main.map((match) => match.bracketRound ?? 1))].sort((a, b) => a - b);
  const count = rounds.length;

  if (count === 0) {
    return null;
  }

  const geometry = bracketGeometry(count, placement.length, { width, height });
  const { mirror, column, gapX, scale } = geometry;
  // По высоте сетка растягивается на всю область: пустота раздаётся между
  // встречами, а не остаётся полосой внизу.
  const tall = Math.max(geometry.height, height / scale);
  const body = tall - CAPTION;
  const step = column + gapX;
  const placed: Placed[] = [];
  const captions: { x: number; text: string; final: boolean }[] = [];

  for (const [index, round] of rounds.entries()) {
    const slots = 2 ** (count - 1 - index);
    const final = index === count - 1;
    const name = roundName(count - 1 - index, t);

    if (!mirror || final) {
      const x = mirror ? (count - 1) * step : index * step;
      captions.push({ x, text: name, final });

      for (const match of main.filter((current) => (current.bracketRound ?? 1) === round)) {
        const slot = match.bracketSlot ?? 0;
        placed.push({ match, x, y: CAPTION + ((slot + 0.5) * body) / slots });
      }

      continue;
    }

    const half = slots / 2;
    const left = index * step;
    const right = (count * 2 - 2 - index) * step;
    captions.push({ x: left, text: name, final: false }, { x: right, text: name, final: false });

    for (const match of main.filter((current) => (current.bracketRound ?? 1) === round)) {
      const slot = match.bracketSlot ?? 0;
      const side = slot < half ? left : right;
      const local = slot < half ? slot : slot - half;
      placed.push({ match, x: side, y: CAPTION + ((local + 0.5) * body) / half });
    }
  }

  const finalBox = placed.find((item) => (item.match.bracketRound ?? 1) === rounds.at(-1));
  const finalX = (count - 1) * step;
  const finalY = finalBox?.y ?? CAPTION + body / 2;
  const placementTop = finalY + BOX / 2 + PLACEMENT_GAP;

  // Линии: от встречи к середине зазора, вдоль к паре и в следующий круг.
  const paths: string[] = [];
  const at = (round: number, slot: number): Placed | undefined =>
    placed.find(
      (item) => (item.match.bracketRound ?? 1) === round && (item.match.bracketSlot ?? 0) === slot,
    );

  for (const [index, round] of rounds.slice(0, -1).entries()) {
    const nextRound = rounds[index + 1] ?? round;

    for (const item of placed.filter((current) => (current.match.bracketRound ?? 1) === round)) {
      const next = at(nextRound, Math.floor((item.match.bracketSlot ?? 0) / 2));

      if (next === undefined) {
        continue;
      }

      const rightward = next.x > item.x;
      const from = rightward ? item.x + column : item.x;
      const to = rightward ? next.x : next.x + column;
      const middle = rightward ? from + gapX / 2 : from - gapX / 2;

      paths.push(
        `M${String(from)} ${String(item.y)}H${String(middle)}V${String(next.y)}H${String(to)}`,
      );
    }
  }

  const offset = Math.max(0, (width - geometry.width * scale) / 2);

  return (
    <Box sx={{ position: 'relative', width, height, overflow: 'hidden' }}>
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: geometry.width,
          height: tall,
          transformOrigin: '0 0',
        }}
        style={{ transform: `translateX(${String(offset)}px) scale(${String(scale)})` }}
      >
        <Box
          component="svg"
          aria-hidden
          width={geometry.width}
          height={tall}
          sx={{ position: 'absolute', inset: 0, overflow: 'visible' }}
        >
          {paths.map((path, index) => (
            <path key={index} d={path} fill="none" stroke="var(--line-strong)" strokeWidth={1.5} />
          ))}
        </Box>

        {captions.map((caption, index) => (
          <Box
            key={index}
            sx={{
              position: 'absolute',
              left: caption.x,
              top: 0,
              width: column,
              textAlign: 'center',
              fontSize: 17,
              fontWeight: 700,
              color: caption.final ? 'primary.main' : 'text.secondary',
            }}
          >
            {caption.text}
          </Box>
        ))}

        {placed.map((item) => (
          <MatchBox
            key={item.match.id}
            match={item.match}
            x={item.x}
            y={item.y - BOX / 2}
            width={column}
            names={names}
            ratings={ratings}
          />
        ))}

        {placement.map((match, index) => {
          const top = placementTop + index * (PLACEMENT_CAPTION + BOX + GAP_Y);

          return (
            <Box key={match.id}>
              <Box
                sx={{
                  position: 'absolute',
                  left: finalX,
                  top,
                  width: column,
                  textAlign: 'center',
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'text.secondary',
                }}
              >
                {placement.length === 1
                  ? t('results.bracket.thirdPlace')
                  : t('results.bracket.placement')}
              </Box>
              <MatchBox
                match={match}
                x={finalX}
                y={top + PLACEMENT_CAPTION}
                width={column}
                names={names}
                ratings={ratings}
              />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function MatchBox({
  match,
  x,
  y,
  width,
  names,
  ratings,
}: {
  readonly match: MatchView;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly names: ReadonlyMap<string, string>;
  readonly ratings: ReadonlyMap<string, string>;
}): ReactNode {
  const t = useT();
  const live = match.status === 'PLAYING';

  return (
    <Box
      sx={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height: BOX,
        borderRadius: '8px',
        border: 1,
        borderColor: live ? 'var(--warn)' : 'divider',
        bgcolor: 'background.paper',
        ...(live ? { boxShadow: 'inset 0 0 0 2px var(--warn)' } : {}),
      }}
    >
      {live && match.tableNumber !== null && (
        <Box
          component="span"
          sx={{
            position: 'absolute',
            right: 0,
            top: -22,
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--warn-text)',
          }}
        >
          {fill(t('screen.bracket.table'), { number: String(match.tableNumber) })}
        </Box>
      )}
      <Side match={match} side="A" names={names} ratings={ratings} width={width} />
      <Box sx={{ height: '1px', bgcolor: 'divider' }} />
      <Side match={match} side="B" names={names} ratings={ratings} width={width} />
    </Box>
  );
}

function Side({
  match,
  side,
  names,
  ratings,
  width,
}: {
  readonly match: MatchView;
  readonly side: 'A' | 'B';
  readonly names: ReadonlyMap<string, string>;
  readonly ratings: ReadonlyMap<string, string>;
  readonly width: number;
}): ReactNode {
  const id = side === 'A' ? match.playerAId : match.playerBId;
  const own = side === 'A' ? match.setsA : match.setsB;
  const other = side === 'A' ? match.setsB : match.setsA;
  const played = own !== null && other !== null;
  const won = played && own > other;
  const rating = id === null ? '' : (ratings.get(id) ?? '');

  return (
    <Box
      sx={{
        height: ROW,
        px: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: FONT,
        ...(id === null
          ? { color: 'text.disabled' }
          : won
            ? { fontWeight: 700 }
            : played
              ? { color: 'text.secondary' }
              : {}),
      }}
    >
      <Box component="span" sx={{ minWidth: 0, flexGrow: 1 }}>
        <FitName text={id === null ? '—' : (names.get(id) ?? '—')} width={width - 94} font={FONT} />
      </Box>
      <Box
        component="span"
        sx={{
          flexShrink: 0,
          fontFamily: DISPLAY,
          fontSize: 13,
          fontWeight: 400,
          color: 'text.secondary',
        }}
      >
        {rating}
      </Box>
      {own !== null && (
        <Box
          component="span"
          sx={{
            flexShrink: 0,
            minWidth: 26,
            height: 26,
            display: 'grid',
            placeItems: 'center',
            borderRadius: '6px',
            fontFamily: DISPLAY,
            fontWeight: 700,
            ...(won
              ? { bgcolor: 'var(--red-600)', color: '#ffffff' }
              : { bgcolor: 'var(--paper-sunken)', color: 'text.secondary' }),
          }}
        >
          {own}
        </Box>
      )}
    </Box>
  );
}
