import type { PlayerTournamentMatchView, PlayerTournamentView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { fill, formatDate, useLocale, useT, type MessageKey } from '@/common/i18n';
import { roundName } from '@/common/ui/bracket-model';
import DeltaPill from '@/common/ui/delta-pill';
import EmptyState from '@/common/ui/empty-state';
import QueryState from '@/common/ui/query-state';
import RankBadge from '@/common/ui/rank-badge';
import { RowsSkeleton } from '@/common/ui/skeleton';

import { OpponentButton } from './player-summary';
import { playerTournamentsQuery } from './queries';

interface PlayerResultsProps {
  readonly playerId: string;
  readonly onSelectOpponent: (opponentId: string) => void;
}

/**
 * «Результаты» — по турнирам, как у RTTF, ADR-048.
 *
 * Карточка на турнир: дата, клуб, место, изменение рейтинга; внутри встречи
 * стадией, соперником и счётом. Плоский список встреч прятал главное — чем
 * турнир кончился: место приходилось искать на странице результатов.
 */
export default function PlayerResults({
  playerId,
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

function TournamentCard({
  item,
  onSelectOpponent,
}: {
  readonly item: PlayerTournamentView;
  readonly onSelectOpponent: (opponentId: string) => void;
}): ReactNode {
  const t = useT();
  const locale = useLocale();

  return (
    <Paper component="li" variant="outlined" sx={{ overflow: 'hidden' }}>
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          pt: { xs: 2, sm: 2.5 },
          pb: 1.5,
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) auto' },
          gap: { xs: 1.5, sm: 3 },
          alignItems: 'center',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Link
            href={`/tournaments/${item.tournament.id}`}
            color="inherit"
            sx={{ typography: 'h3', display: 'block' }}
          >
            {item.tournament.name}
          </Link>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {formatDate(item.tournament.startsAt, locale)} ·{' '}
            <Link href={`/clubs/${item.tournament.club.id}`} color="inherit">
              {item.tournament.club.name}
            </Link>
          </Typography>
        </Box>

        <Stack direction="row" spacing={2.5} sx={{ alignItems: 'center' }}>
          <Place item={item} />
          {item.delta !== null && (
            <Box sx={{ textAlign: 'right' }}>
              <DeltaPill value={item.delta} />
              {item.ratingAfter !== null && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 0.25, fontVariantNumeric: 'tabular-nums' }}
                >
                  {t('profile.results.ratingAfter')} {item.ratingAfter}
                </Typography>
              )}
            </Box>
          )}
        </Stack>
      </Box>

      <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none' }}>
        {item.matches.map((match) => (
          <MatchRow key={match.matchId} match={match} onSelectOpponent={onSelectOpponent} />
        ))}
      </Box>
    </Paper>
  );
}

/** Место: медаль у призёров, диапазон у делённого, слово у идущего. */
function Place({ item }: { readonly item: PlayerTournamentView }): ReactNode {
  const t = useT();

  if (item.place === null) {
    return (
      <Typography variant="body2" color="text.secondary">
        {item.tournament.status === 'RUNNING'
          ? t('profile.results.running')
          : t('profile.results.noPlace')}
      </Typography>
    );
  }

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Typography variant="body2" color="text.secondary">
        {t('profile.results.place')}
      </Typography>
      {item.placeTo === null ? (
        <RankBadge rank={item.place} />
      ) : (
        <Typography sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {item.place}–{item.placeTo}
        </Typography>
      )}
      {item.participants > 0 && (
        <Typography variant="body2" color="text.secondary">
          {fill(t('profile.results.of'), { count: String(item.participants) })}
        </Typography>
      )}
    </Stack>
  );
}

/**
 * Встреча внутри турнира: стадия, соперник, счёт, изменение рейтинга.
 * Победитель — полужирный счёт, поражение приглушено (07, 3.4); исход ещё
 * и словом для чтеца экрана.
 */
function MatchRow({
  match,
  onSelectOpponent,
}: {
  readonly match: PlayerTournamentMatchView;
  readonly onSelectOpponent: (opponentId: string) => void;
}): ReactNode {
  const t = useT();
  const opponent = match.opponent;

  return (
    <Box
      component="li"
      sx={{
        px: { xs: 2, sm: 3 },
        py: 1.25,
        borderTop: 1,
        borderColor: 'divider',
        display: 'grid',
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr) auto',
          sm: 'minmax(140px, 220px) minmax(0, 1fr) auto auto',
        },
        columnGap: 2,
        rowGap: 0.25,
        alignItems: 'center',
      }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        noWrap
        sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}
      >
        {stageLabel(match, t)}
      </Typography>
      <Box sx={{ minWidth: 0 }}>
        {opponent === null ? (
          <Typography variant="body2" color="text.secondary">
            {t('player.matches.noOpponent')}
          </Typography>
        ) : (
          <OpponentButton
            name={`${opponent.lastName} ${opponent.firstName}`}
            onClick={() => {
              onSelectOpponent(opponent.id);
            }}
          />
        )}
      </Box>
      <Typography
        aria-label={`${t(match.won ? 'player.matches.won' : 'player.matches.lost')} ${String(match.setsFor)}:${String(match.setsAgainst)}`}
        sx={{
          fontVariantNumeric: 'tabular-nums',
          fontWeight: match.won ? 700 : 400,
          color: match.won ? 'text.primary' : 'text.secondary',
        }}
      >
        {match.setsFor}:{match.setsAgainst}
      </Typography>
      <Box sx={{ display: { xs: 'none', sm: 'block' }, minWidth: 64, textAlign: 'right' }}>
        {match.delta !== null && <DeltaPill value={match.delta} />}
      </Box>
    </Box>
  );
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
