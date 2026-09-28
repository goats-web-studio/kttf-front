import type { GroupStandingsView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useEffect, useState, type ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';

import { size } from './scale';

interface StandingsBoardProps {
  readonly groups: readonly GroupStandingsView[];
  readonly names: ReadonlyMap<string, string>;
  readonly ratings: ReadonlyMap<string, string>;
}

/** Сколько секунд висит одна группа, прежде чем стена покажет следующую. */
const PAGE_SECONDS = 12;

/**
 * Групповые таблицы на стене — ТЗ 6.5 и 6.6.
 *
 * Группы листаются сами по одной: восемь таблиц на одном телевизоре не
 * читаются ни с какого расстояния, а прокрутить стену некому. Номер страницы
 * виден, чтобы зритель знал — его группа будет через одну.
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
  const [page, setPage] = useState(0);
  const pages = groups.length;

  useEffect(() => {
    if (pages <= 1) {
      return;
    }

    const timer = setInterval(() => {
      setPage((current) => (current + 1) % pages);
    }, PAGE_SECONDS * 1000);

    return () => {
      clearInterval(timer);
    };
  }, [pages]);

  const group = groups[page % Math.max(1, pages)];

  if (group === undefined) {
    return null;
  }

  return (
    <Box
      component="section"
      aria-label={t('screen.standings.title')}
      sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
    >
      <Box
        sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2 }}
      >
        <Typography component="h2" color="text.secondary" sx={TITLE}>
          {t('screen.standings.title')}
        </Typography>
        {pages > 1 && (
          <Typography
            color="text.secondary"
            sx={{ fontSize: size(0.9), fontVariantNumeric: 'tabular-nums' }}
          >
            {fill(t('screen.standings.page'), { page: String(page + 1), pages: String(pages) })}
          </Typography>
        )}
      </Box>

      <Table
        key={`${group.stageId}:${group.groupId ?? 'single'}`}
        sx={{
          ...TABLE,
          mt: '0.8vh',
          animation: 'kttf-page 400ms ease-out',
          '@keyframes kttf-page': { from: { opacity: 0 }, to: { opacity: 1 } },
        }}
      >
        <caption>{group.label}</caption>
        <TableHead>
          <TableRow>
            <TableCell scope="col" align="right">
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
              <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                {row.place ?? '—'}
              </TableCell>
              <TableCell
                sx={{
                  maxWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {names.get(row.participant) ?? t('screen.match.pending')}
                <Box
                  component="span"
                  sx={{ ml: '0.5vw', fontSize: size(0.85), color: 'text.secondary' }}
                >
                  {ratings.get(row.participant) ?? ''}
                </Box>
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
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
    </Box>
  );
}

const TITLE = {
  fontSize: size(1.2),
  lineHeight: 1.2,
  fontWeight: 600,
} as const;

/** Таблица на стене: крупный кегль, цифры столбиком, подпись группы сверху. */
const TABLE = {
  tableLayout: 'fixed',
  fontVariantNumeric: 'tabular-nums',
  '& caption': {
    captionSide: 'top',
    p: 0,
    pb: '0.4vh',
    textAlign: 'left',
    fontSize: size(1.1),
    fontWeight: 600,
    color: 'text.primary',
  },
  '& .MuiTableCell-root': {
    px: '0.5vw',
    py: '0.5vh',
    fontSize: size(1.2),
    lineHeight: 1.3,
    borderColor: 'divider',
  },
  '& .MuiTableCell-head': { fontSize: size(0.75), color: 'text.secondary', py: '0.3vh' },
  '& th:nth-of-type(1)': { width: '9%' },
  '& th:nth-of-type(3)': { width: '10%' },
  '& th:nth-of-type(4)': { width: '12%' },
  '& th:nth-of-type(5)': { width: '20%' },
} as const;
