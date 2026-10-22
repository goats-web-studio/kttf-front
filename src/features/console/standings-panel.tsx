import type { GroupStandingsView, MatchView, StageView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import { VISUALLY_HIDDEN } from '@/common/ui/visually-hidden';

import { matchesOf } from './group-matches';

interface StandingsPanelProps {
  readonly groups: readonly GroupStandingsView[];
  readonly stages: readonly StageView[];
  readonly names: ReadonlyMap<string, string>;
  readonly ratings: ReadonlyMap<string, string>;
  /** Сколько выходит из группы дальше; `null` — схема без выхода. */
  readonly advance?: number | null;
}

/**
 * Групповые таблицы в консоли — ТЗ 6.6.
 *
 * Своя вёрстка, а не заимствованная у публичных результатов: из консоли
 * нельзя импортировать фичи публичной части, иначе их зависимости уезжают
 * в её чанки (ADR-004). Здесь и содержание другое — матрица «каждый с
 * каждым» и рейтинг рядом с фамилией, которые нужны судье, а не зрителю.
 *
 * Ни одно число не считается: всё приходит от сервера, посчитанное общим
 * движком. Второй расчёт таблицы на клиенте — запрет №2 брифа.
 */
export default function StandingsPanel({
  groups,
  stages,
  names,
  ratings,
  advance = null,
}: StandingsPanelProps): ReactNode {
  const t = useT();

  if (groups.length === 0) {
    return null;
  }

  return (
    <section>
      {/* Глазу заголовок дублирует вкладка над панелью — остаётся диктору. */}
      <Typography component="h2" sx={VISUALLY_HIDDEN}>
        {t('console.standings.title')}
      </Typography>
      {groups.map((group) => (
        <GroupTable
          key={`${group.stageId}:${group.groupId ?? 'single'}`}
          group={group}
          matches={matchesOf(stages, group)}
          names={names}
          ratings={ratings}
          advance={advance}
        />
      ))}
    </section>
  );
}

/** Встреча двух игроков группы, если она есть в расписании. */
function matchBetween(
  matches: readonly MatchView[],
  a: string,
  b: string,
): {
  readonly match: MatchView;
  readonly mine: number | null;
  readonly theirs: number | null;
} | null {
  for (const match of matches) {
    if (match.playerAId === a && match.playerBId === b) {
      return { match, mine: match.setsA, theirs: match.setsB };
    }

    if (match.playerAId === b && match.playerBId === a) {
      return { match, mine: match.setsB, theirs: match.setsA };
    }
  }

  return null;
}

/** Числа таблицы — дисплейным набором, разряды столбиком. */
const DISPLAY = 'var(--font-mono)';

function GroupTable({
  group,
  matches,
  names,
  ratings,
  advance,
}: {
  readonly group: GroupStandingsView;
  readonly matches: readonly MatchView[];
  readonly names: ReadonlyMap<string, string>;
  readonly ratings: ReadonlyMap<string, string>;
  readonly advance: number | null;
}): ReactNode {
  const t = useT();
  const order = group.rows.map((row) => row.participant);

  return (
    <Paper variant="outlined" sx={{ mt: 1.5, overflowX: 'auto' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 2,
          px: 2,
          pt: 1.5,
          pb: 0.5,
        }}
      >
        <Typography
          component="h3"
          sx={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 22, lineHeight: '28px' }}
        >
          {group.label}
        </Typography>
        {advance !== null && (
          <Typography
            component="span"
            variant="caption"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              color: 'var(--ok)',
              fontWeight: 600,
            }}
          >
            <Box
              component="span"
              aria-hidden
              sx={{ width: 4, height: 14, borderRadius: 1, bgcolor: 'var(--ok)' }}
            />
            {t('screen.group.advance')}
          </Typography>
        )}
      </Box>

      <Table size="small" sx={{ minWidth: 560, ...MATRIX }}>
        <TableHead>
          <TableRow>
            <TableCell scope="col" sx={{ width: 28 }}>
              #
            </TableCell>
            <TableCell scope="col" sx={STICKY_NAME}>
              {t('console.standings.player')}
            </TableCell>
            {order.map((_participant, index) => (
              <TableCell key={index} scope="col" align="center" sx={{ width: 56 }}>
                {index + 1}
              </TableCell>
            ))}
            <TableCell scope="col" align="center" sx={{ width: 56 }}>
              {t('console.standings.points')}
            </TableCell>
            <TableCell scope="col" align="center" sx={{ width: 56 }}>
              {t('console.standings.sets')}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {group.rows.map((row, index) => {
            const through = advance !== null && row.place !== null && row.place <= advance;

            return (
              <TableRow
                key={row.participant}
                // Зона выхода — зелёная черта слева и зелёное место: то же,
                // что на экране зала, судья и зритель видят одно.
                sx={{ boxShadow: through ? 'inset 4px 0 0 var(--ok)' : 'none' }}
              >
                <TableCell
                  className="big"
                  sx={{
                    fontFamily: DISPLAY,
                    fontSize: 18,
                    fontWeight: 700,
                    color: through ? 'var(--ok)' : 'text.secondary',
                  }}
                >
                  {/* Пусто, пока равенство не разрешил судья — ADR-008. */}
                  {row.place ?? (
                    <Box component="span" sx={{ color: 'var(--warn-text)' }}>
                      ?
                    </Box>
                  )}
                </TableCell>
                <TableCell component="th" scope="row" sx={STICKY_NAME}>
                  <Box component="span" sx={{ fontWeight: 600, fontSize: 15 }}>
                    {names.get(row.participant) ?? row.participant}
                  </Box>{' '}
                  {/* Рейтинг рядом с фамилией — ТЗ 6.6. На телефоне его нет:
                      там каждая колонка на счету, а рейтинг виден в окне
                      встречи. */}
                  <Box
                    component="span"
                    sx={{
                      display: { xs: 'none', sm: 'inline' },
                      color: 'text.secondary',
                      fontSize: 12,
                    }}
                  >
                    {ratings.get(row.participant) ?? ''}
                  </Box>
                </TableCell>

                {order.map((opponent, column) => (
                  <TableCell key={column} align="center">
                    <Cell
                      self={column === index}
                      found={matchBetween(matches, row.participant, opponent)}
                    />
                  </TableCell>
                ))}

                <TableCell
                  className="big"
                  align="center"
                  sx={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 700 }}
                >
                  {row.points}
                </TableCell>
                <TableCell align="center" sx={{ fontSize: 14 }}>
                  {row.setsWon}:{row.setsLost}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Paper>
  );
}

/**
 * Клетка матрицы — как у экрана зала и у турнир-менеджера RTTF: победа на
 * зелёной подложке, поражение на красной, своя клетка — серый блок, идущая
 * встреча — красная точка. Счёт всегда написан цифрами: цвет второй носитель.
 */
function Cell({
  self,
  found,
}: {
  readonly self: boolean;
  readonly found: ReturnType<typeof matchBetween>;
}): ReactNode {
  const t = useT();

  if (self) {
    return (
      <Box
        aria-hidden
        sx={{
          mx: 'auto',
          width: 44,
          height: 28,
          borderRadius: 1.5,
          bgcolor: 'var(--paper-sunken)',
        }}
      />
    );
  }

  if (found?.match.status === 'PLAYING') {
    return (
      <Box
        component="span"
        aria-label={t('screen.group.playing')}
        sx={{ color: 'var(--red-600)', fontSize: 16, lineHeight: 1 }}
      >
        ●
      </Box>
    );
  }

  if (found?.mine == null || found.theirs === null) {
    return (
      <Box component="span" sx={{ color: 'text.disabled' }}>
        ·
      </Box>
    );
  }

  const won = found.mine > found.theirs;

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-grid',
        placeItems: 'center',
        minWidth: 44,
        height: 28,
        px: 0.75,
        borderRadius: 1.5,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        ...(won
          ? { bgcolor: 'var(--ok-50)', color: 'var(--ok-text)' }
          : { bgcolor: 'var(--red-50)', color: 'var(--red-700)' }),
      }}
    >
      {found.mine}:{found.theirs}
    </Box>
  );
}

/**
 * Фамилии стоят на месте, когда матрица листается вбок (раздел 4 дизайн-
 * системы): на телефоне таблица группы шире экрана, и без этого судья видел
 * счёт, но не видел, чей он.
 */
const STICKY_NAME = {
  whiteSpace: 'nowrap',
  position: 'sticky',
  left: 0,
  zIndex: 1,
  bgcolor: 'background.paper',
} as const;

/**
 * Плотная матрица: ячейки узкие, цифры столбиком. Крупные числа — место и
 * очки — помечены классом `big` и мелкий кегль не наследуют: селектор
 * таблицы сильнее `sx` ячейки и иначе перебивал бы их.
 */
const MATRIX = {
  '& .MuiTableCell-root': {
    px: 0.75,
    py: 0.75,
    lineHeight: '20px',
    fontVariantNumeric: 'tabular-nums',
  },
  '& .MuiTableCell-root:not(.big)': { fontSize: 13 },
  '& .MuiTableCell-root:first-of-type': { pl: 2.5 },
  '& .MuiTableCell-root:last-of-type': { pr: 2 },
} as const;
