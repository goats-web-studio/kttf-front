import type { GroupStandingsView, MatchView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';

import FitName from './fit-name';
import { DISPLAY, TYPE, tint } from './scale';
import { GROUP_CARD } from './slides';

interface GroupBoardProps {
  readonly group: GroupStandingsView;
  readonly matches: readonly MatchView[];
  readonly names: ReadonlyMap<string, string>;
  readonly ratings: ReadonlyMap<string, string>;
  /** Сколько выходит из группы дальше. `null` — схема без выхода. */
  readonly advance: number | null;
  /** Ширина карточки на сцене: от неё считается место под фамилию. */
  readonly width: number;
}

/**
 * Группа на стене — таблица «каждый с каждым» (ТЗ 6.5, 6.6).
 *
 * Матрица, а не только очки: зритель видит, кто у кого выиграл и с кем
 * ещё не играл, — ровно то, о чём спорят у стены. Клетка победы зелёная,
 * поражения — красная, идущая прямо сейчас встреча — номером стола, как в
 * RTTF: игрок находит себя в своей группе и сразу видит, куда идти.
 * Зона выхода в плей-офф отчёркнута зелёной линейкой слева.
 *
 * Ни одно число не считается здесь: очки, разницы и места пришли от
 * сервера, посчитанные общим движком (запрет №2 брифа). Клетка матрицы —
 * это счёт встречи как он записан, а не расчёт.
 *
 * Размеры — в пикселях сцены из `GROUP_CARD`: по ним же `groupPages`
 * считает, сколько групп помещается на экран.
 */
export default function GroupBoard({
  group,
  matches,
  names,
  ratings,
  advance,
  width,
}: GroupBoardProps): ReactNode {
  const t = useT();
  const order = group.rows.map((row) => row.participant);
  const fixed =
    GROUP_CARD.place + order.length * GROUP_CARD.cell + GROUP_CARD.points + GROUP_CARD.sets;
  const nameWidth = width - fixed - GROUP_CARD.padding * 2;
  const columns = `${String(GROUP_CARD.place)}px minmax(0, 1fr) repeat(${String(order.length)}, ${String(GROUP_CARD.cell)}px) ${String(GROUP_CARD.points)}px ${String(GROUP_CARD.sets)}px`;

  return (
    <Box
      sx={{
        minWidth: 0,
        px: `${String(GROUP_CARD.padding)}px`,
        pb: `${String(GROUP_CARD.padding)}px`,
        borderRadius: '12px',
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          height: GROUP_CARD.head,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <Typography
          component="h3"
          sx={{ fontFamily: DISPLAY, fontSize: TYPE.s, fontWeight: 700, lineHeight: 1 }}
        >
          {group.label}
        </Typography>
        {advance !== null && (
          <Typography
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: TYPE.xs,
              fontWeight: 600,
              color: 'success.main',
            }}
          >
            <Box
              component="span"
              sx={{ width: '6px', height: '1em', borderRadius: '2px', bgcolor: 'success.main' }}
            />
            {fill(t('screen.group.advanceN'), { count: String(advance) })}
          </Typography>
        )}
      </Box>

      <Box role="table" aria-label={group.label} sx={{ fontVariantNumeric: 'tabular-nums' }}>
        <Box
          role="row"
          sx={{
            height: GROUP_CARD.columns,
            display: 'grid',
            gridTemplateColumns: columns,
            alignItems: 'center',
            fontSize: TYPE.xs,
            color: 'text.secondary',
          }}
        >
          <Box role="columnheader" sx={{ textAlign: 'center' }}>
            #
          </Box>
          <Box role="columnheader" sx={{ pl: '8px' }}>
            {t('screen.standings.player')}
          </Box>
          {order.map((_participant, index) => (
            <Box key={index} role="columnheader" sx={{ textAlign: 'center' }}>
              {index + 1}
            </Box>
          ))}
          <Box role="columnheader" sx={{ textAlign: 'center' }}>
            {t('screen.standings.pointsShort')}
          </Box>
          <Box role="columnheader" sx={{ textAlign: 'center' }}>
            {t('screen.standings.sets')}
          </Box>
        </Box>

        {group.rows.map((row, index) => {
          const through = advance !== null && row.place !== null && row.place <= advance;
          const rating = ratings.get(row.participant) ?? '';

          return (
            <Box
              key={row.participant}
              role="row"
              sx={{
                height: GROUP_CARD.row,
                display: 'grid',
                gridTemplateColumns: columns,
                alignItems: 'center',
                borderTop: 1,
                borderColor: 'divider',
                boxShadow: through ? 'inset 5px 0 0 var(--ok)' : 'none',
                fontSize: TYPE.s,
                lineHeight: 1.2,
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
                sx={{ minWidth: 0, pl: '8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}
              >
                <Box component="span" sx={{ minWidth: 0, fontWeight: 600 }}>
                  <FitName
                    text={names.get(row.participant) ?? t('screen.match.pending')}
                    width={nameWidth - rating.length * 10 - 16}
                    font={TYPE.s}
                  />
                </Box>
                <Box
                  component="span"
                  sx={{
                    flexShrink: 0,
                    fontFamily: DISPLAY,
                    fontSize: 15,
                    color: 'text.secondary',
                  }}
                >
                  {rating}
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
                sx={{ textAlign: 'center', fontFamily: DISPLAY, fontWeight: 700, fontSize: TYPE.m }}
              >
                {row.points}
              </Box>
              <Box
                role="cell"
                sx={{
                  textAlign: 'center',
                  fontFamily: DISPLAY,
                  fontSize: 18,
                  color: 'text.secondary',
                }}
              >
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
    mx: '4px',
    height: 28,
    display: 'grid',
    placeItems: 'center',
    borderRadius: '4px',
    fontFamily: DISPLAY,
    fontSize: 17,
    fontWeight: 600,
  } as const;

  if (self) {
    return <Box role="cell" sx={{ ...base, bgcolor: 'background.default' }} />;
  }

  if (match?.status === 'PLAYING') {
    return (
      <Box
        role="cell"
        // Идущая встреча — номер стола на жёлтом, как у RTTF «6 ст»: игрок
        // видит в своей группе, куда идти.
        aria-label={t('screen.group.playing')}
        sx={{
          ...base,
          fontFamily: 'inherit',
          fontSize: 14,
          fontWeight: 700,
          bgcolor: 'var(--warn-50)',
          color: 'var(--warn-text)',
        }}
      >
        {match.tableNumber === null
          ? '●'
          : fill(t('screen.group.table'), { number: String(match.tableNumber) })}
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
        bgcolor: won ? tint('ok', 22) : tint('red-600', 15),
        color: won ? 'var(--ok-text)' : 'var(--red-700)',
      }}
    >
      {mine}:{theirs}
    </Box>
  );
}
