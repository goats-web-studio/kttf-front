import type { PlayerBestWinView, PlayerStatsPeriod } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import { useTheme } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { formatDateTime, useLocale, useT, type MessageKey } from '@/common/i18n';
import DeltaPill from '@/common/ui/delta-pill';
import QueryState from '@/common/ui/query-state';
import RatingValue from '@/common/ui/rating-value';
import { RowsSkeleton } from '@/common/ui/skeleton';
import Surface from '@/common/ui/surface';
import { VISUALLY_HIDDEN } from '@/common/ui/visually-hidden';

import { Minutes, Score } from './match-cells';
import PillTabs from '@/common/ui/pill-tabs';
import { playerName } from './player-name';
import { playerBestWinsQuery } from './queries';

/** Порядок вкладок — как у RTTF: от всего времени к кварталу. */
const PERIODS: readonly (readonly [PlayerStatsPeriod, MessageKey])[] = [
  ['ALL', 'profile.period.ALL'],
  ['YEAR', 'profile.period.YEAR'],
  ['HALF', 'profile.period.HALF'],
  ['QUARTER', 'profile.period.QUARTER'],
];

/**
 * «Лучшие победы» — ровной таблицей, как у RTTF (ADR-050): когда, где, оба
 * рейтинга на момент встречи, счёт, изменение и длительность. Победа читается
 * разницей двух рейтингов одного дня, поэтому оба стоят в строке.
 *
 * Период свой, а не общий со статистикой: «лучшая победа за год» и «игры за
 * квартал» — разные вопросы. На телефоне таблица становится карточками —
 * восемь колонок в 360px без горизонтального скролла не помещаются (07, 4).
 */
export default function BestWins({ playerId }: { readonly playerId: string }): ReactNode {
  const t = useT();
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });
  const [period, setPeriod] = useState<PlayerStatsPeriod>('ALL');
  const wins = useQuery({
    ...playerBestWinsQuery(playerId, period),
    // Пока грузится другой период, видны прежние строки, а не скелетон.
    placeholderData: keepPreviousData,
  });
  const items = wins.data?.items ?? [];

  return (
    <Surface title={t('profile.bestWins.title')} flush>
      <Box sx={{ px: { xs: 2, sm: 3 }, pb: 2 }}>
        <PillTabs
          value={period}
          options={PERIODS}
          label={t('profile.bestWins.period')}
          onChange={setPeriod}
        />
      </Box>
      <QueryState
        isPending={wins.isPending}
        error={wins.error}
        onRetry={() => void wins.refetch()}
        loading={
          <Box sx={{ px: { xs: 2, sm: 3 }, pb: 2 }}>
            <RowsSkeleton rows={3} />
          </Box>
        }
      >
        {items.length === 0 ? (
          <Typography color="text.secondary" sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 } }}>
            {t('profile.bestWins.empty')}
          </Typography>
        ) : (
          <Box sx={{ opacity: wins.isPlaceholderData ? 0.6 : 1 }}>
            {wide ? <WinsTable items={items} /> : <WinsCards items={items} />}
          </Box>
        )}
      </QueryState>
    </Surface>
  );
}

function WinsTable({ items }: { readonly items: readonly PlayerBestWinView[] }): ReactNode {
  const t = useT();
  const locale = useLocale();

  return (
    <Table size="small" data-best-wins="table">
      <Box component="caption" sx={VISUALLY_HIDDEN}>
        {t('profile.bestWins.title')}
      </Box>
      <TableHead>
        <TableRow>
          <TableCell sx={EDGE_START}>{t('profile.col.date')}</TableCell>
          <TableCell>{t('profile.col.tournament')}</TableCell>
          <TableCell align="right">{t('profile.col.rating')}</TableCell>
          <TableCell>{t('profile.col.opponent')}</TableCell>
          <TableCell align="right">{t('profile.col.opponentRating')}</TableCell>
          <TableCell align="right">{t('profile.col.score')}</TableCell>
          <TableCell align="right">
            <abbr title={t('profile.col.deltaFull')}>{t('profile.col.delta')}</abbr>
          </TableCell>
          <TableCell align="right" sx={EDGE_END}>
            <abbr title={t('profile.col.durationFull')}>{t('profile.col.duration')}</abbr>
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((win) => (
          <TableRow key={win.matchId}>
            <TableCell sx={{ ...EDGE_START, ...NUM, color: 'text.secondary' }}>
              {formatDateTime(whenOf(win), locale)}
            </TableCell>
            <TableCell>
              <Link href={`/tournaments/${win.tournament.id}`} color="inherit">
                {win.tournament.name}
              </Link>
            </TableCell>
            <TableCell align="right">
              <RatingValue value={win.ratingBefore} />
            </TableCell>
            <TableCell>
              <Link href={`/players/${win.opponent.id}`} color="inherit" sx={{ fontWeight: 600 }}>
                {playerName(win.opponent)}
              </Link>
            </TableCell>
            <TableCell align="right">
              <RatingValue value={win.opponentRating} sx={{ fontWeight: 600 }} />
            </TableCell>
            <TableCell align="right">
              <Score setsFor={win.setsFor} setsAgainst={win.setsAgainst} won />
            </TableCell>
            <TableCell align="right">
              <DeltaPill value={win.delta} />
            </TableCell>
            <TableCell align="right" sx={{ ...EDGE_END, ...NUM, color: 'text.secondary' }}>
              <Minutes value={win.durationMinutes} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Телефон: соперник и счёт крупно, остальное подписями (07, 4). */
function WinsCards({ items }: { readonly items: readonly PlayerBestWinView[] }): ReactNode {
  const t = useT();
  const locale = useLocale();

  return (
    <Box component="ol" data-best-wins="cards" sx={{ m: 0, p: 0, listStyle: 'none' }}>
      {items.map((win) => (
        <Box
          key={win.matchId}
          component="li"
          sx={{
            px: 2,
            py: 1.5,
            borderTop: 1,
            borderColor: 'divider',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            columnGap: 2,
            rowGap: 0.5,
            alignItems: 'center',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Link href={`/players/${win.opponent.id}`} color="inherit" sx={{ fontWeight: 600 }}>
              {playerName(win.opponent)}
            </Link>{' '}
            <RatingValue
              value={win.opponentRating}
              sx={{ typography: 'body2', color: 'text.secondary' }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Score setsFor={win.setsFor} setsAgainst={win.setsAgainst} won />
            <DeltaPill value={win.delta} />
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ gridColumn: '1 / -1', overflowWrap: 'anywhere' }}
          >
            <Link href={`/tournaments/${win.tournament.id}`} color="inherit">
              {win.tournament.name}
            </Link>
            {' · '}
            {formatDateTime(whenOf(win), locale)}
            {win.durationMinutes !== null && (
              <>
                {' · '}
                <Minutes value={win.durationMinutes} withUnit />
              </>
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ gridColumn: '1 / -1' }}>
            {t('profile.col.rating')} <RatingValue value={win.ratingBefore} />
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

/** Когда сыграна: вызов к столу, иначе счёт, иначе старт турнира. */
function whenOf(win: PlayerBestWinView): string {
  return win.startedAt ?? win.playedAt ?? win.tournament.startsAt;
}

/** Крайние колонки — с отступом карточки, чтобы таблица не липла к краю. */
/** Цифры столбиком — одной ширины (07, 3.5). */
const NUM = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } as const;
const EDGE_START = { pl: 3 } as const;
const EDGE_END = { pr: 3 } as const;
