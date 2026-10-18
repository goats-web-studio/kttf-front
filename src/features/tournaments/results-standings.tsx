import type { GroupStandingsView, TournamentStandingsView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

import ResultsTies from './results-ties';

/** Числа — одной ширины цифр, чтобы разряды стояли столбиком (раздел 6.1). */
const NUM = { fontVariantNumeric: 'tabular-nums' } as const;

/**
 * Колонка с фамилиями липкая при прокрутке вбок (раздел 6.1): на телефоне
 * таблица шире экрана, и без имени строка цифр ничего не значит.
 */
const STICKY = { position: 'sticky', left: 0, zIndex: 1, bgcolor: 'background.default' } as const;

interface ResultsStandingsProps {
  readonly standings: TournamentStandingsView;
  readonly names: ReadonlyMap<string, string>;
}

/**
 * Групповые таблицы — ТЗ 9.4 и ТЗ 6.6.
 *
 * Ничего не считается: и очки, и разницы, и места приходят от сервера ровно
 * такими, какими их посчитал общий движок. Сложить их здесь ещё раз означало
 * бы второе понимание таблицы на клиенте — запрет №2 брифа.
 *
 * У олимпийки таблиц нет вовсе, и это ответ, а не пропуск: секция просто
 * не показывается.
 */
export default function ResultsStandings({ standings, names }: ResultsStandingsProps): ReactNode {
  const t = useT();

  if (standings.groups.length === 0) {
    return null;
  }

  return (
    <Box component="section" sx={{ mt: 6 }}>
      <Typography variant="h2">{t('results.standings.title')}</Typography>
      {standings.groups.map((group) => (
        <GroupTable
          key={`${group.stageId}:${group.groupId ?? 'single'}`}
          group={group}
          names={names}
        />
      ))}
    </Box>
  );
}

function GroupTable({
  group,
  names,
}: {
  readonly group: GroupStandingsView;
  readonly names: ReadonlyMap<string, string>;
}): ReactNode {
  const t = useT();

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h3">{group.label}</Typography>
      <TableContainer sx={{ mt: 1 }}>
        <Table size="small" sx={{ minWidth: 512 }}>
          <TableHead>
            <TableRow>
              <TableCell align="right" sx={{ width: 48 }}>
                {t('standings.place')}
              </TableCell>
              <TableCell sx={STICKY}>{t('standings.player')}</TableCell>
              <TableCell align="right">{t('standings.played')}</TableCell>
              <TableCell align="right">{t('standings.wins')}</TableCell>
              <TableCell align="right">{t('standings.losses')}</TableCell>
              <TableCell align="right">{t('standings.points')}</TableCell>
              <TableCell align="right">{t('standings.sets')}</TableCell>
              <TableCell align="right">{t('standings.balls')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {group.rows.map((row) => (
              <TableRow key={row.participant}>
                <TableCell align="right" sx={{ fontWeight: 600, ...NUM }}>
                  {/* Пусто, пока равенство не разрешил судья — ADR-008. */}
                  {row.place ?? (
                    <Box component="span" sx={{ color: 'text.disabled' }}>
                      —
                    </Box>
                  )}
                </TableCell>
                <TableCell sx={{ ...STICKY, fontWeight: 500 }}>
                  {names.get(row.participant) ?? row.participant}
                </TableCell>
                <TableCell align="right" sx={{ ...NUM, color: 'text.secondary' }}>
                  {row.played}
                </TableCell>
                <TableCell align="right" sx={{ ...NUM, color: 'text.secondary' }}>
                  {row.wins}
                </TableCell>
                <TableCell align="right" sx={{ ...NUM, color: 'text.secondary' }}>
                  {row.losses}
                </TableCell>
                <TableCell align="right" sx={{ ...NUM, fontWeight: 600 }}>
                  {row.points}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ ...NUM, color: 'text.secondary', whiteSpace: 'nowrap' }}
                >
                  {row.setsWon} : {row.setsLost} <Diff value={row.setDiff} />
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ ...NUM, color: 'text.secondary', whiteSpace: 'nowrap' }}
                >
                  {row.ballsWon} : {row.ballsLost} <Diff value={row.ballDiff} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <ResultsTies title={t('results.unresolved.title')} ties={group.unresolved} names={names} />
    </Box>
  );
}

/** Разница со знаком: по ней читается порядок, когда очки равны (ТЗ 6.6). */
function Diff({ value }: { readonly value: number }): ReactNode {
  return (
    <Box component="span" sx={{ color: 'text.disabled' }}>
      {value > 0 ? `+${String(value)}` : String(value)}
    </Box>
  );
}
