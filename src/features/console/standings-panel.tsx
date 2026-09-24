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

import { matchesOf } from './group-matches';

interface StandingsPanelProps {
  readonly groups: readonly GroupStandingsView[];
  readonly stages: readonly StageView[];
  readonly names: ReadonlyMap<string, string>;
  readonly ratings: ReadonlyMap<string, string>;
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
}: StandingsPanelProps): ReactNode {
  const t = useT();

  if (groups.length === 0) {
    return null;
  }

  return (
    <section>
      <Typography
        component="h2"
        variant="subtitle2"
        color="text.secondary"
        sx={{ fontWeight: 600 }}
      >
        {t('console.standings.title')}
      </Typography>
      {groups.map((group) => (
        <GroupTable
          key={`${group.stageId}:${group.groupId ?? 'single'}`}
          group={group}
          matches={matchesOf(stages, group)}
          names={names}
          ratings={ratings}
        />
      ))}
    </section>
  );
}

/** Счёт личной встречи глазами игрока `a`. `null` — ещё не играли. */
function scoreBetween(matches: readonly MatchView[], a: string, b: string): string | null {
  for (const match of matches) {
    if (match.setsA === null || match.setsB === null) {
      continue;
    }

    if (match.playerAId === a && match.playerBId === b) {
      return `${String(match.setsA)}:${String(match.setsB)}`;
    }

    if (match.playerAId === b && match.playerBId === a) {
      return `${String(match.setsB)}:${String(match.setsA)}`;
    }
  }

  return null;
}

function GroupTable({
  group,
  matches,
  names,
  ratings,
}: {
  readonly group: GroupStandingsView;
  readonly matches: readonly MatchView[];
  readonly names: ReadonlyMap<string, string>;
  readonly ratings: ReadonlyMap<string, string>;
}): ReactNode {
  const t = useT();
  const order = group.rows.map((row) => row.participant);

  return (
    <Paper variant="outlined" sx={{ mt: 1.5, p: 1.5, overflowX: 'auto' }}>
      <Table size="small" sx={{ '& .MuiTableCell-root': CELL, '& caption': CAPTION }}>
        <caption>{group.label}</caption>
        <TableHead>
          <TableRow>
            <TableCell scope="col">{t('console.standings.player')}</TableCell>
            {order.map((_participant, index) => (
              <TableCell key={index} scope="col" align="center">
                {index + 1}
              </TableCell>
            ))}
            <TableCell scope="col" align="right">
              {t('console.standings.points')}
            </TableCell>
            <TableCell scope="col" align="right">
              {t('console.standings.sets')}
            </TableCell>
            <TableCell scope="col" align="right">
              {t('console.standings.balls')}
            </TableCell>
            <TableCell scope="col" align="right">
              {t('console.standings.place')}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {group.rows.map((row, index) => (
            <TableRow key={row.participant}>
              <TableCell component="th" scope="row">
                <Box component="span" sx={{ color: 'text.secondary' }}>
                  {index + 1}.
                </Box>{' '}
                {names.get(row.participant) ?? row.participant}{' '}
                {/* Рейтинг рядом с фамилией — ТЗ 6.6. */}
                <Box component="span" sx={{ color: 'text.secondary' }}>
                  {ratings.get(row.participant) ?? ''}
                </Box>
              </TableCell>

              {order.map((opponent, column) => (
                <TableCell key={column} align="center">
                  {column === index ? (
                    <Box component="span" sx={{ color: 'text.disabled' }}>
                      ×
                    </Box>
                  ) : (
                    (scoreBetween(matches, row.participant, opponent) ?? (
                      <Box component="span" sx={{ color: 'text.disabled' }}>
                        —
                      </Box>
                    ))
                  )}
                </TableCell>
              ))}

              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {row.points}
              </TableCell>
              <TableCell align="right" sx={{ color: 'text.secondary' }}>
                {row.setDiff > 0 ? `+${String(row.setDiff)}` : row.setDiff}
              </TableCell>
              <TableCell align="right" sx={{ color: 'text.secondary' }}>
                {row.ballDiff > 0 ? `+${String(row.ballDiff)}` : row.ballDiff}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {/* Пусто, пока равенство не разрешил судья — ADR-008. */}
                {row.place ?? (
                  <Box component="span" sx={{ color: 'warning.main' }}>
                    ?
                  </Box>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}

/** Название группы над таблицей, а не под ней, как ставит MUI. */
const CAPTION = {
  captionSide: 'top',
  p: 0,
  pb: 1,
  textAlign: 'left',
  typography: 'body2',
  fontWeight: 600,
  color: 'text.primary',
} as const;

/** Плотная матрица: ячейки узкие, цифры столбиком. */
const CELL = {
  px: 0.5,
  py: 0.5,
  fontSize: 12,
  lineHeight: '18px',
  fontVariantNumeric: 'tabular-nums',
} as const;
