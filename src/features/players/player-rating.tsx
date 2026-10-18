import type { RatingHistoryView, RatingPointView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { formatDate, useLocale, useT } from '@/common/i18n';
import DeltaPill from '@/common/ui/delta-pill';
import EmptyState from '@/common/ui/empty-state';

import RatingChart from './rating-chart';
import { buildRatingScale } from './rating-scale';

interface PlayerRatingProps {
  readonly history: RatingHistoryView;
}

/**
 * Кривая рейтинга и история турниров — ТЗ 9.3.
 *
 * Одна секция на две строки требования: точка кривой и есть турнир, и
 * разносить их по разным разделам значило бы показать одни и те же события
 * дважды.
 *
 * **Мест здесь нет намеренно.** Место считает движок по таблицам и сетке
 * турнира целиком (ADR-023); повторять этот расчёт для каждой строки истории
 * означало бы читать пол-базы ради одной колонки. Место показывает страница
 * результатов, куда ведёт ссылка из строки.
 */
export default function PlayerRating({ history }: PlayerRatingProps): ReactNode {
  const t = useT();
  const scale = buildRatingScale(history.points);

  return (
    <Box component="section" sx={{ mt: 5 }}>
      <Typography variant="h2">{t('player.history.title')}</Typography>

      {scale === null ? (
        <Box sx={{ mt: 2 }}>
          <EmptyState title={t('player.history.empty')} />
        </Box>
      ) : (
        <>
          <Paper variant="outlined" sx={{ mt: 2, px: { xs: 2, sm: 3 }, pb: 2 }}>
            <RatingChart scale={scale} />
          </Paper>

          <Paper variant="outlined" sx={{ mt: 2 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={WIDE}>{t('player.history.date')}</TableCell>
                  <TableCell>{t('player.history.tournament')}</TableCell>
                  <TableCell align="right" sx={WIDE}>
                    {t('player.history.matches')}
                  </TableCell>
                  <TableCell align="right">{t('player.history.delta')}</TableCell>
                  <TableCell align="right">{t('player.history.after')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Кривая идёт слева направо, список — от свежего к старому:
                  человек открывает историю ради последнего турнира. */}
                {[...history.points].reverse().map((point, index) => (
                  <Row key={point.tournamentId ?? `adjustment-${String(index)}`} point={point} />
                ))}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
    </Box>
  );
}

/** Колонки, которых на телефоне нет: число встреч вторично к дельте, дата уходит под турнир. */
const WIDE = { display: { xs: 'none', sm: 'table-cell' } } as const;

/** Числа — одной ширины цифр, чтобы разряды стояли столбиком (раздел 6.1). */
const NUM = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } as const;

function Row({ point }: { readonly point: RatingPointView }): ReactNode {
  const t = useT();
  const locale = useLocale();

  return (
    <TableRow>
      <TableCell sx={{ ...WIDE, ...NUM, color: 'text.secondary' }}>
        {formatDate(point.playedAt, locale)}
      </TableCell>
      <TableCell>
        {point.tournamentId === null ? (
          // Ручная корректировка рейтинга (ТЗ 12) не привязана к турниру, но
          // из кривой её не выкинуть: рейтинг после неё другой.
          <Typography component="span" color="text.secondary">
            {t('player.history.adjustment')}
          </Typography>
        ) : (
          <Link href={`/tournaments/${point.tournamentId}`}>
            {point.tournamentName ?? t('player.history.tournament')}
          </Link>
        )}
        {/* На телефоне дата — подписью под турниром, а не колонкой: длинная
            «2 сентября 2026 г.» выдавливала таблицу за экран. */}
        <Typography variant="body2" color="text.secondary" sx={{ display: { sm: 'none' }, ...NUM }}>
          {formatDate(point.playedAt, locale)}
        </Typography>
      </TableCell>
      <TableCell align="right" sx={{ ...WIDE, ...NUM, color: 'text.secondary' }}>
        {point.matches}
      </TableCell>
      <TableCell align="right" sx={NUM}>
        <DeltaPill value={point.delta} />
      </TableCell>
      <TableCell align="right" sx={{ ...NUM, color: 'text.secondary' }}>
        {point.ratingAfter}
      </TableCell>
    </TableRow>
  );
}
