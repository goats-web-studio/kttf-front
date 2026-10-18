import type {
  PlayerTournamentMatchView,
  PlayerTournamentView,
  TournamentLevel,
} from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableFooter from '@mui/material/TableFooter';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { fill, formatDateTime, formatTime, useLocale, useT, type MessageKey } from '@/common/i18n';
import { roundName } from '@/common/ui/bracket-model';
import DeltaPill from '@/common/ui/delta-pill';
import EmptyState from '@/common/ui/empty-state';
import QueryState from '@/common/ui/query-state';
import RankBadge from '@/common/ui/rank-badge';
import RatingValue from '@/common/ui/rating-value';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { VISUALLY_HIDDEN } from '@/common/ui/visually-hidden';

import { Minutes, OpponentButton, Score } from './match-cells';
import { playerName } from './player-name';
import { playerTournamentsQuery } from './queries';

interface PlayerResultsProps {
  readonly playerId: string;
  /** Как игрок назван в строке «Я ★400 · место»: «Я» на своём профиле, имя — на чужом. */
  readonly playerLabel: string;
  readonly onSelectOpponent: (opponentId: string) => void;
}

/**
 * «Результаты» — по турнирам, как у RTTF (ADR-048, ADR-050).
 *
 * Карточка на турнир. Шапка: когда, какого уровня, где, сколько играло, с
 * каким рейтингом игрок пришёл и каким местом кончил. Внутри — встречи
 * таблицей: время, стадия, соперник с рейтингом на тот момент, счёт,
 * изменение, минуты. Внизу итог: победы и поражения, сумма изменений,
 * минуты за столом и рейтинг после.
 *
 * На телефоне встречи — карточками: семь колонок в 360px без
 * горизонтального скролла не помещаются (07, 4).
 */
export default function PlayerResults({
  playerId,
  playerLabel,
  onSelectOpponent,
}: PlayerResultsProps): ReactNode {
  const t = useT();
  const results = useInfiniteQuery(playerTournamentsQuery(playerId));
  const items = results.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <Box component="section">
      <Typography variant="h2">{t('profile.results.title')}</Typography>
      <Box sx={{ mt: 2 }}>
        <QueryState
          isPending={results.isPending}
          error={results.error}
          onRetry={() => void results.refetch()}
          loading={<RowsSkeleton rows={3} />}
        >
          {items.length === 0 ? (
            <EmptyState title={t('profile.results.empty')} />
          ) : (
            <Stack component="ol" spacing={2} sx={{ m: 0, p: 0, listStyle: 'none' }}>
              {items.map((item) => (
                <TournamentCard
                  key={item.tournament.id}
                  item={item}
                  playerLabel={playerLabel}
                  onSelectOpponent={onSelectOpponent}
                />
              ))}
            </Stack>
          )}
        </QueryState>

        {results.hasNextPage && (
          <Button
            onClick={() => void results.fetchNextPage()}
            disabled={results.isFetchingNextPage}
            sx={{ mt: 2, minHeight: 44 }}
          >
            {results.isFetchingNextPage ? t('common.loading') : t('profile.results.more')}
          </Button>
        )}
      </Box>
    </Box>
  );
}

interface CardProps {
  readonly item: PlayerTournamentView;
  readonly playerLabel: string;
  readonly onSelectOpponent: (opponentId: string) => void;
}

function TournamentCard({ item, playerLabel, onSelectOpponent }: CardProps): ReactNode {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });
  const totals = totalsOf(item);

  return (
    <Paper
      component="li"
      variant="outlined"
      sx={{ overflow: 'hidden' }}
      data-result={item.tournament.id}
    >
      <Box sx={{ px: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 2.5 }, pb: 1.5 }}>
        <Link
          href={`/tournaments/${item.tournament.id}`}
          color="inherit"
          sx={{ typography: 'h3', display: 'block' }}
        >
          {item.tournament.name}
        </Link>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          {formatDateTime(item.tournament.startsAt, locale)}
          {' · '}
          {t(LEVEL[item.tournament.level])}
          {' · '}
          <Link href={`/clubs/${item.tournament.club.id}`} color="inherit">
            {item.tournament.club.name}
          </Link>
          {item.participants > 0 && (
            <>
              {' · '}
              {fill(t('profile.results.participants'), { count: String(item.participants) })}
            </>
          )}
        </Typography>

        <Stack
          direction="row"
          useFlexGap
          spacing={1}
          sx={{ mt: 1.5, alignItems: 'center', flexWrap: 'wrap', typography: 'body2' }}
          data-result-me
        >
          <Box component="span" sx={{ fontWeight: 600 }}>
            {playerLabel}
          </Box>
          {item.ratingBefore !== null && (
            <>
              <RatingValue value={item.ratingBefore} sx={{ fontWeight: 600 }} />
              <Box component="span" sx={{ color: 'text.secondary' }}>
                {t('profile.results.atStart')}
              </Box>
            </>
          )}
          <Box component="span" aria-hidden sx={{ color: 'text.secondary' }}>
            ·
          </Box>
          <Place item={item} />
        </Stack>
      </Box>

      {wide ? (
        <MatchTable item={item} totals={totals} onSelectOpponent={onSelectOpponent} />
      ) : (
        <MatchCards item={item} totals={totals} onSelectOpponent={onSelectOpponent} />
      )}
    </Paper>
  );
}

/** Место: медаль у призёров, диапазон у делённого, слово у идущего. */
function Place({ item }: { readonly item: PlayerTournamentView }): ReactNode {
  const t = useT();

  if (item.place === null) {
    return (
      <Box component="span" sx={{ color: 'text.secondary' }}>
        {item.tournament.status === 'RUNNING'
          ? t('profile.results.running')
          : t('profile.results.noPlace')}
      </Box>
    );
  }

  return (
    <>
      <Box component="span" sx={{ color: 'text.secondary' }}>
        {t('profile.results.place')}
      </Box>
      {item.placeTo === null ? (
        <RankBadge rank={item.place} />
      ) : (
        <Box component="span" sx={{ ...NUM, fontWeight: 600 }}>
          {item.place}–{item.placeTo}
        </Box>
      )}
    </>
  );
}

interface Totals {
  readonly wins: number;
  readonly losses: number;
  /** Сумма минут известных встреч; `null` — ни у одной длительности нет. */
  readonly minutes: number | null;
}

/**
 * Итог турнира из его встреч. Изменение рейтинга не складывается здесь:
 * сумму дельт считает сервер (ADR-014) — она приходит полем турнира.
 */
function totalsOf(item: PlayerTournamentView): Totals {
  const known = item.matches.flatMap((match) =>
    match.durationMinutes === null ? [] : [match.durationMinutes],
  );
  const wins = item.matches.filter((match) => match.won).length;

  return {
    wins,
    losses: item.matches.length - wins,
    minutes: known.length === 0 ? null : known.reduce((sum, value) => sum + value, 0),
  };
}

interface MatchesProps {
  readonly item: PlayerTournamentView;
  readonly totals: Totals;
  readonly onSelectOpponent: (opponentId: string) => void;
}

function MatchTable({ item, totals, onSelectOpponent }: MatchesProps): ReactNode {
  const t = useT();
  const locale = useLocale();

  return (
    <Table size="small" data-result-table>
      <Box component="caption" sx={VISUALLY_HIDDEN}>
        {t('profile.results.matches')}
      </Box>
      <TableHead>
        <TableRow>
          <TableCell sx={EDGE_START}>{t('profile.col.time')}</TableCell>
          <TableCell>{t('profile.results.stage')}</TableCell>
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
        {item.matches.map((match) => (
          <TableRow key={match.matchId}>
            <TableCell sx={{ ...EDGE_START, ...NUM, color: 'text.secondary' }}>
              {match.startedAt === null ? '—' : formatTime(match.startedAt, locale)}
            </TableCell>
            <TableCell sx={{ color: 'text.secondary' }}>{stageLabel(match, t)}</TableCell>
            <TableCell>
              <Opponent match={match} onSelectOpponent={onSelectOpponent} />
            </TableCell>
            <TableCell align="right">
              {match.opponentRating === null ? '—' : <RatingValue value={match.opponentRating} />}
            </TableCell>
            <TableCell align="right">
              <Score setsFor={match.setsFor} setsAgainst={match.setsAgainst} won={match.won} />
            </TableCell>
            <TableCell align="right">
              {match.delta !== null && <DeltaPill value={match.delta} />}
            </TableCell>
            <TableCell align="right" sx={{ ...EDGE_END, ...NUM, color: 'text.secondary' }}>
              <Minutes value={match.durationMinutes} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter data-result-total>
        <TableRow
          sx={{
            bgcolor: 'var(--paper-sunken)',
            '& td': { borderBottom: 0, color: 'text.primary', fontSize: 'inherit' },
          }}
        >
          <TableCell sx={{ ...EDGE_START, fontWeight: 600 }}>
            {t('profile.results.total')}
          </TableCell>
          <TableCell colSpan={3}>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}
            >
              <span>{record(totals, t)}</span>
              {item.ratingAfter !== null && (
                <span>
                  {t('profile.results.ratingAfter')}{' '}
                  <RatingValue value={item.ratingAfter} sx={{ fontWeight: 700 }} />
                </span>
              )}
            </Box>
          </TableCell>
          <TableCell />
          <TableCell align="right">
            {item.delta !== null && <DeltaPill value={item.delta} />}
          </TableCell>
          <TableCell align="right" sx={{ ...EDGE_END, ...NUM, fontWeight: 600 }}>
            <Minutes value={totals.minutes} />
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

/** Телефон: соперник и счёт крупно, стадия, время и минуты подписью (07, 4). */
function MatchCards({ item, totals, onSelectOpponent }: MatchesProps): ReactNode {
  const t = useT();
  const locale = useLocale();

  return (
    <>
      <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none' }} data-result-cards>
        {item.matches.map((match) => (
          <Box
            key={match.matchId}
            component="li"
            sx={{
              px: 2,
              py: 1.25,
              borderTop: 1,
              borderColor: 'divider',
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto',
              columnGap: 2,
              rowGap: 0.25,
              alignItems: 'center',
            }}
          >
            <Typography variant="body2" color="text.secondary" noWrap>
              {stageLabel(match, t)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={NUM}>
              {match.startedAt === null ? null : formatTime(match.startedAt, locale)}
              {match.startedAt !== null && match.durationMinutes !== null && ' · '}
              {match.durationMinutes === null ? null : (
                <Minutes value={match.durationMinutes} withUnit />
              )}
            </Typography>
            <Box sx={{ minWidth: 0 }}>
              <Opponent match={match} onSelectOpponent={onSelectOpponent} />
              {match.opponentRating !== null && (
                <>
                  {' '}
                  <RatingValue
                    value={match.opponentRating}
                    sx={{ typography: 'body2', color: 'text.secondary' }}
                  />
                </>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Score setsFor={match.setsFor} setsAgainst={match.setsAgainst} won={match.won} />
              {match.delta !== null && <DeltaPill value={match.delta} />}
            </Box>
          </Box>
        ))}
      </Box>
      <Box
        data-result-total
        sx={{
          px: 2,
          py: 1.5,
          bgcolor: 'var(--paper-sunken)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          columnGap: 2,
          rowGap: 0.5,
          alignItems: 'center',
          typography: 'body2',
        }}
      >
        <Box sx={{ fontWeight: 600 }}>{t('profile.results.total')}</Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {totals.minutes !== null && (
            <Box component="span" sx={{ ...NUM, color: 'text.secondary' }}>
              <Minutes value={totals.minutes} withUnit />
            </Box>
          )}
          {item.delta !== null && <DeltaPill value={item.delta} />}
        </Box>
        <Box sx={{ color: 'text.secondary' }}>{record(totals, t)}</Box>
        {item.ratingAfter !== null && (
          <Box component="span" sx={{ textAlign: 'right' }}>
            <Box component="span" sx={{ color: 'text.secondary' }}>
              {t('profile.results.ratingAfter')}
            </Box>{' '}
            <RatingValue value={item.ratingAfter} sx={{ fontWeight: 700 }} />
          </Box>
        )}
      </Box>
    </>
  );
}

function Opponent({
  match,
  onSelectOpponent,
}: {
  readonly match: PlayerTournamentMatchView;
  readonly onSelectOpponent: (opponentId: string) => void;
}): ReactNode {
  const t = useT();
  const opponent = match.opponent;

  if (opponent === null) {
    return (
      <Box component="span" sx={{ color: 'text.secondary' }}>
        {t('player.matches.noOpponent')}
      </Box>
    );
  }

  return (
    <OpponentButton
      name={playerName(opponent)}
      onClick={() => {
        onSelectOpponent(opponent.id);
      }}
    />
  );
}

function record(totals: Totals, t: (key: MessageKey) => string): string {
  return fill(t('profile.results.record'), {
    wins: String(totals.wins),
    losses: String(totals.losses),
  });
}

/** «Финал · Плей-офф», «Групповой этап · гр. 2», «Матч за 3-е место · Плей-офф». */
function stageLabel(match: PlayerTournamentMatchView, t: (key: MessageKey) => string): string {
  if (match.placement) {
    return `${t('results.bracket.thirdPlace')} · ${match.stageName}`;
  }

  if (match.roundFromFinal !== null) {
    return `${roundName(match.roundFromFinal, t)} · ${match.stageName}`;
  }

  return match.groupLabel === null ? match.stageName : `${match.stageName} · ${match.groupLabel}`;
}

/**
 * Уровень турнира словом. Своя карта, а не из `features/tournaments`: фичи
 * друг друга не импортируют (07, 11), а ключи словаря те же.
 */
const LEVEL: Readonly<Record<TournamentLevel, MessageKey>> = {
  CLUB: 'tournament.level.CLUB',
  REGIONAL: 'tournament.level.REGIONAL',
  NATIONAL: 'tournament.level.NATIONAL',
};

const NUM = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } as const;
const EDGE_START = { pl: 3 } as const;
const EDGE_END = { pr: 3 } as const;
