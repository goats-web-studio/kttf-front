import type { PlayerStatsPeriod, PlayerSummaryView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { UseQueryResult } from '@tanstack/react-query';
import { Building2, Flag, Medal, Swords, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';

import { fill, formatCount, formatDate, useLocale, useT, type MessageKey } from '@/common/i18n';
import DeltaPill from '@/common/ui/delta-pill';
import QueryState from '@/common/ui/query-state';
import RankBadge from '@/common/ui/rank-badge';
import { RowsSkeleton } from '@/common/ui/skeleton';
import StatTile from '@/common/ui/stat-tile';
import Surface from '@/common/ui/surface';

import PeriodTabs from './period-tabs';

const PERIODS: readonly (readonly [PlayerStatsPeriod, MessageKey])[] = [
  ['QUARTER', 'profile.period.QUARTER'],
  ['HALF', 'profile.period.HALF'],
  ['YEAR', 'profile.period.YEAR'],
  ['ALL', 'profile.period.ALL'],
];

interface PlayerSummaryProps {
  readonly summary: UseQueryResult<PlayerSummaryView>;
  readonly period: PlayerStatsPeriod;
  readonly onPeriod: (period: PlayerStatsPeriod) => void;
  readonly onSelectOpponent: (opponentId: string) => void;
}

/**
 * «Общая статистика», «Лучшие победы» и «Награды» — блоки RTTF, ADR-048.
 *
 * Всё из одной сводки сервера: по странице встреч статистика менялась бы от
 * перелистывания. Период переключает статистику и лучшие победы; место в
 * рейтинге, первый турнир и награды — за всё время.
 */
export default function PlayerSummary({
  summary,
  period,
  onPeriod,
  onSelectOpponent,
}: PlayerSummaryProps): ReactNode {
  const t = useT();

  return (
    <>
      <Surface title={t('profile.stats.title')}>
        <PeriodTabs
          value={period}
          options={PERIODS}
          label={t('profile.stats.period')}
          onChange={onPeriod}
        />
        <Box sx={{ mt: 2 }}>
          <QueryState
            isPending={summary.isPending}
            error={summary.error}
            onRetry={() => void summary.refetch()}
            loading={<RowsSkeleton rows={2} />}
          >
            {summary.data === undefined ? null : <Stats summary={summary.data} />}
          </QueryState>
        </Box>
      </Surface>

      {summary.data !== undefined && (
        <>
          <BestWins summary={summary.data} onSelectOpponent={onSelectOpponent} />
          <Awards summary={summary.data} />
        </>
      )}
    </>
  );
}

function Stats({ summary }: { readonly summary: PlayerSummaryView }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const none = t('profile.stats.none');

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))',
      }}
    >
      <StatTile
        icon={Trophy}
        label={t('profile.stats.rank')}
        value={
          <Value
            main={formatCount(summary.rank, locale)}
            note={fill(t('profile.stats.rankOf'), {
              total: formatCount(summary.rankedPlayers, locale),
            })}
          />
        }
      />
      <StatTile
        icon={Flag}
        label={t('profile.stats.tournaments')}
        value={<Value main={formatCount(summary.tournaments, locale)} />}
      />
      <StatTile
        icon={Swords}
        label={t('profile.stats.games')}
        value={
          <Value
            main={formatCount(summary.wins + summary.losses, locale)}
            note={`${formatCount(summary.wins, locale)} — ${formatCount(summary.losses, locale)}`}
          />
        }
      />
      <StatTile
        icon={Medal}
        label={t('profile.stats.first')}
        value={
          summary.firstTournament === null ? (
            none
          ) : (
            <Link href={`/tournaments/${summary.firstTournament.id}`} color="inherit">
              {formatDate(summary.firstTournament.startsAt, locale)}
            </Link>
          )
        }
      />
      <StatTile
        icon={Building2}
        label={t('profile.stats.favorite')}
        value={
          summary.favoriteClub === null ? (
            none
          ) : (
            <Value
              main={
                <Link href={`/clubs/${summary.favoriteClub.id}`} color="inherit">
                  {summary.favoriteClub.name}
                </Link>
              }
              note={fill(t('profile.stats.favoriteCount'), {
                count: String(summary.favoriteClub.tournaments),
              })}
            />
          )
        }
      />
    </Box>
  );
}

/** Число и пояснение мельче: «8 из 120», «26 · 21 — 5». */
function Value({ main, note }: { readonly main: ReactNode; readonly note?: string }): ReactNode {
  return (
    <>
      <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {main}
      </Box>
      {note !== undefined && (
        <Box
          component="span"
          sx={{
            ml: 1,
            typography: 'body2',
            color: 'text.secondary',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {note}
        </Box>
      )}
    </>
  );
}

/**
 * Лучшие победы — списком, а не таблицей: на телефоне шесть колонок RTTF
 * не помещаются, а горизонтальный скролл таблицы вне консоли запрещён (07, 4).
 * Касание соперника открывает личный счёт, как в результатах.
 */
function BestWins({
  summary,
  onSelectOpponent,
}: {
  readonly summary: PlayerSummaryView;
  readonly onSelectOpponent: (opponentId: string) => void;
}): ReactNode {
  const t = useT();
  const locale = useLocale();

  return (
    <Surface title={t('profile.bestWins.title')} flush>
      {summary.bestWins.length === 0 ? (
        <Typography color="text.secondary" sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 } }}>
          {t('profile.bestWins.empty')}
        </Typography>
      ) : (
        <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none' }}>
          {summary.bestWins.map((win) => (
            <Box
              key={win.matchId}
              component="li"
              sx={{
                px: { xs: 2, sm: 3 },
                py: 1.5,
                borderTop: 1,
                borderColor: 'divider',
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                alignItems: 'center',
                columnGap: 2,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <OpponentButton
                  name={`${win.opponent.lastName} ${win.opponent.firstName}`}
                  onClick={() => {
                    onSelectOpponent(win.opponent.id);
                  }}
                />
                <Typography
                  component="span"
                  variant="body2"
                  color="text.secondary"
                  sx={{ ml: 1, fontVariantNumeric: 'tabular-nums' }}
                >
                  {win.opponentRating}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  <Link href={`/tournaments/${win.tournament.id}`} color="inherit">
                    {win.tournament.name}
                  </Link>
                  {' · '}
                  {formatDate(win.playedAt ?? win.tournament.startsAt, locale)}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {win.setsFor}:{win.setsAgainst}
                </Typography>
                <DeltaPill value={win.delta} />
              </Stack>
            </Box>
          ))}
        </Box>
      )}
    </Surface>
  );
}

/**
 * Награды — призовые места медалями. Блок появляется, только когда есть что
 * показать: пустые «Награды» у новичка читаются как упрёк, а не сведения.
 */
function Awards({ summary }: { readonly summary: PlayerSummaryView }): ReactNode {
  const t = useT();
  const locale = useLocale();

  if (summary.awards.length === 0) {
    return null;
  }

  return (
    <Surface title={t('profile.awards.title')}>
      <Box
        component="ul"
        sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 1 }}
      >
        {summary.awards.map((award) => (
          <Box
            key={award.tournament.id}
            component="li"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              pl: 1,
              pr: 2,
              py: 1,
              // Не пилюля: длинное название в две строки в пилюле читается овалом.
              borderRadius: 3,
              bgcolor: 'var(--paper-sunken)',
              maxWidth: '100%',
            }}
          >
            <RankBadge rank={award.place} />
            <Box sx={{ minWidth: 0 }}>
              <Link
                href={`/tournaments/${award.tournament.id}`}
                color="inherit"
                sx={{ display: 'block', typography: 'body2', fontWeight: 600 }}
                aria-label={`${fill(t('profile.awards.place'), { place: String(award.place) })}: ${award.tournament.name}`}
              >
                {award.tournament.name}
              </Link>
              <Typography variant="caption" color="text.secondary">
                {formatDate(award.tournament.startsAt, locale)}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Surface>
  );
}

/** Соперник — кнопкой: касание открывает личный счёт (ТЗ 9.3). */
export function OpponentButton({
  name,
  onClick,
}: {
  readonly name: string;
  readonly onClick: () => void;
}): ReactNode {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        font: 'inherit',
        fontWeight: 600,
        textAlign: 'left',
        borderRadius: 1,
        '@media (hover: hover)': { '&:hover': { color: 'primary.main' } },
        '&.Mui-focusVisible': { outline: '2px solid var(--red-600)', outlineOffset: '2px' },
      }}
    >
      {name}
    </ButtonBase>
  );
}
