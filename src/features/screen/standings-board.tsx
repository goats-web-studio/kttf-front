import type { GroupStandingsView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

interface StandingsBoardProps {
  readonly groups: readonly GroupStandingsView[];
  readonly names: ReadonlyMap<string, string>;
  readonly ratings: ReadonlyMap<string, string>;
}

/**
 * Групповые таблицы на стене — ТЗ 6.5 и 6.6.
 *
 * Без матрицы «каждый с каждым», в отличие от консоли: судье она нужна, чтобы
 * понимать, кто с кем ещё не играл, а зрителю с десяти метров важны место,
 * очки и разницы. Рейтинг рядом с фамилией остаётся — ТЗ 6.6 требует его.
 *
 * Ни одно число не считается здесь: всё пришло от сервера, посчитанное общим
 * движком. Второй расчёт таблицы на клиенте — запрет №2 брифа.
 */
export default function StandingsBoard({ groups, names, ratings }: StandingsBoardProps): ReactNode {
  const t = useT();

  if (groups.length === 0) {
    return null;
  }

  return (
    <section>
      <Typography
        variant="h2"
        color="text.secondary"
        sx={{ fontFamily: 'inherit', fontSize: 22, lineHeight: '28px', fontWeight: 600 }}
      >
        {t('screen.standings.title')}
      </Typography>

      <Box
        sx={{
          mt: 1.5,
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' },
        }}
      >
        {groups.map((group) => (
          <Table key={`${group.stageId}:${group.groupId ?? 'single'}`} sx={TABLE}>
            <caption>{group.label}</caption>
            <TableHead>
              <TableRow>
                <TableCell scope="col" align="right" sx={{ pr: 2 }}>
                  {t('screen.standings.place')}
                </TableCell>
                <TableCell scope="col">{t('screen.standings.player')}</TableCell>
                <TableCell scope="col" align="right">
                  {t('screen.standings.points')}
                </TableCell>
                <TableCell scope="col" align="right">
                  {t('screen.standings.sets')}
                </TableCell>
                <TableCell scope="col" align="right">
                  {t('screen.standings.balls')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {group.rows.map((row) => (
                <TableRow key={row.participant}>
                  {/* Пустое место — равенство, которого судья ещё не развёл (ADR-008). */}
                  <TableCell align="right" sx={{ pr: 2, color: 'text.secondary' }}>
                    {row.place ?? '—'}
                  </TableCell>
                  <TableCell>
                    {names.get(row.participant) ?? t('screen.match.pending')}
                    <Box
                      component="span"
                      sx={{ ml: 1, fontSize: 15, lineHeight: '24px', color: 'text.secondary' }}
                    >
                      {ratings.get(row.participant) ?? ''}
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {row.points}
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary' }}>
                    {row.setsWon}:{row.setsLost}
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary' }}>
                    {row.ballsWon}:{row.ballsLost}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ))}
      </Box>
    </section>
  );
}

/** Таблица на стене: крупный кегль, цифры столбиком, подпись группы сверху. */
const TABLE = {
  fontVariantNumeric: 'tabular-nums',
  '& caption': {
    captionSide: 'top',
    p: 0,
    pb: 0.5,
    textAlign: 'left',
    fontSize: 17,
    lineHeight: '26px',
    color: 'text.secondary',
  },
  '& .MuiTableCell-root': { px: 1, py: 0.5, fontSize: 22, lineHeight: '28px' },
  '& .MuiTableCell-head': { fontSize: 13, lineHeight: '20px', color: 'text.secondary' },
} as const;
