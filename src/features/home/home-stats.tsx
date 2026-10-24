import type { HomeLeader, HomeStatsPeriod, HomeUpset } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { formatDate, formatDelta, useLocale, useT } from '@/common/i18n';
import PillTabs from '@/common/ui/pill-tabs';
import RatingValue from '@/common/ui/rating-value';
import { RowsSkeleton } from '@/common/ui/skeleton';

import { homeLeadersQuery, homeUpsetsQuery } from './stats-queries';

const PERIODS = [
  ['WEEK', 'home.stats.period.WEEK'],
  ['MONTH', 'home.stats.period.MONTH'],
  ['YEAR', 'home.stats.period.YEAR'],
] as const;

const NUM = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } as const;

interface HomeStatsProps {
  readonly period: HomeStatsPeriod;
  readonly onPeriod: (period: HomeStatsPeriod) => void;
}

/**
 * «Статистика» главной — ADR-071, как у RTTF: кто больше всех играл и
 * выигрывал, и лучшие победы — слабый по рейтингу обыграл сильного. Один
 * переключатель периода на весь блок: три таблицы отвечают на один вопрос
 * «что было за неделю», и разные периоды рядом сбивали бы с толку.
 *
 * Пустые таблицы не выводятся; пустой весь блок — тоже: на пилотной базе
 * за неделю бывает тихо, и тогда лучше показать месяц, чем «нет данных».
 */
export default function HomeStats({ period, onPeriod }: HomeStatsProps): ReactNode {
  const t = useT();
  const leaders = useQuery(homeLeadersQuery(period));
  const upsets = useQuery(homeUpsetsQuery(period));

  const pending = leaders.isPending || upsets.isPending;
  const tournaments = leaders.data?.tournaments ?? [];
  const wins = leaders.data?.wins ?? [];
  const best = upsets.data?.items ?? [];
  const empty = !pending && tournaments.length + wins.length + best.length === 0;

  return (
    <Box sx={{ display: 'grid', gap: 2 }} data-home-stats>
      {/* В сетке переключатель растянулся бы на всю ширину — как у профиля, по содержимому. */}
      <Box sx={{ justifySelf: { xs: 'stretch', sm: 'start' } }}>
        <PillTabs
          value={period}
          options={PERIODS}
          label={t('home.stats.periodLabel')}
          onChange={onPeriod}
        />
      </Box>

      {pending ? (
        <RowsSkeleton rows={5} />
      ) : empty ? (
        <Typography color="text.secondary">{t('home.stats.empty')}</Typography>
      ) : (
        <>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
            }}
          >
            {tournaments.length > 0 && (
              <LeaderTable
                title={t('home.stats.tournaments')}
                unit={t('home.stats.tournamentsUnit')}
                rows={tournaments}
                data="tournaments"
              />
            )}
            {wins.length > 0 && (
              <LeaderTable
                title={t('home.stats.wins')}
                unit={t('home.stats.winsUnit')}
                rows={wins}
                data="wins"
              />
            )}
          </Box>
          {best.length > 0 && <Upsets rows={best} />}
        </>
      )}
    </Box>
  );
}

function LeaderTable({
  title,
  unit,
  rows,
  data,
}: {
  readonly title: string;
  readonly unit: string;
  readonly rows: readonly HomeLeader[];
  readonly data: string;
}): ReactNode {
  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }} data-home-leaders={data}>
      <Typography variant="h3" component="h3" sx={{ px: 2, pt: 1.75, pb: 1 }}>
        {title}
      </Typography>
      <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none' }}>
        {rows.map((row, index) => (
          <Box
            component="li"
            key={row.player.id}
            sx={{
              display: 'grid',
              gridTemplateColumns: '20px minmax(0, 1fr) auto auto',
              alignItems: 'center',
              columnGap: 1.25,
              px: 2,
              py: 0.75,
              fontSize: 13.5,
              borderTop: '1px solid var(--line)',
            }}
          >
            <Box component="span" sx={{ ...NUM, color: 'text.secondary' }}>
              {index + 1}
            </Box>
            <Link
              href={`/players/${row.player.id}`}
              color="text.primary"
              underline="hover"
              sx={{
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {row.player.name}
            </Link>
            <RatingValue value={row.player.rating} animate={false} />
            <Box
              component="span"
              title={unit}
              sx={{ ...NUM, fontWeight: 700, minWidth: 24, textAlign: 'right' }}
            >
              {row.count}
            </Box>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

/**
 * Лучшие победы строкой RTTF: победитель с рейтингом и приростом, счёт по
 * партиям, проигравший с потерей. Счёта по сетам нет — его не ведут (ADR-063).
 */
function Upsets({ rows }: { readonly rows: readonly HomeUpset[] }): ReactNode {
  const t = useT();
  const locale = useLocale();

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }} data-home-upsets>
      <Typography variant="h3" component="h3" sx={{ px: 2, pt: 1.75, pb: 1 }}>
        {t('home.stats.upsets')}
      </Typography>
      <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
        {rows.map((row) => (
          <Box
            component="li"
            key={row.matchId}
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'minmax(0, 1fr) auto minmax(0, 1fr)',
                md: '96px minmax(0, 1fr) auto minmax(0, 1fr)',
              },
              alignItems: 'center',
              columnGap: 1.5,
              rowGap: 0.25,
              px: 2,
              py: 1,
              fontSize: 13.5,
              borderTop: '1px solid var(--line)',
            }}
          >
            <Box
              sx={{
                display: { xs: 'none', md: 'grid' },
                color: 'text.secondary',
                fontSize: 12,
                minWidth: 0,
              }}
            >
              <span>{formatDate(row.tournament.startsAt, locale)}</span>
              <Link
                href={`/tournaments/${row.tournament.id}`}
                color="inherit"
                underline="hover"
                sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {row.club.name}
              </Link>
            </Box>
            <Side
              id={row.winner.id}
              name={row.winner.name}
              rating={row.winnerRating}
              delta={row.winnerDelta}
              align="right"
            />
            <Box
              component="span"
              sx={{ ...NUM, fontWeight: 800, px: 0.5 }}
              aria-label={`${String(row.setsWinner)}:${String(row.setsLoser)}`}
            >
              {row.setsWinner}:{row.setsLoser}
            </Box>
            <Side
              id={row.loser.id}
              name={row.loser.name}
              rating={row.loserRating}
              delta={row.loserDelta}
              align="left"
            />
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

function Side({
  id,
  name,
  rating,
  delta,
  align,
}: {
  readonly id: string;
  readonly name: string;
  readonly rating: string;
  readonly delta: string;
  readonly align: 'left' | 'right';
}): ReactNode {
  const gain = !delta.startsWith('-');

  return (
    <Box sx={{ minWidth: 0, display: 'grid', justifyItems: align === 'right' ? 'end' : 'start' }}>
      <Link
        href={`/players/${id}`}
        color="text.primary"
        underline="hover"
        sx={{
          maxWidth: '100%',
          fontWeight: 600,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {name}
      </Link>
      <Box
        component="span"
        sx={{ ...NUM, display: 'flex', gap: 0.75, fontSize: 12, color: 'text.secondary' }}
      >
        <RatingValue value={rating} animate={false} />
        <Box component="span" sx={{ color: gain ? 'var(--ok)' : 'var(--red-600)' }}>
          {formatDelta(delta)}
        </Box>
      </Box>
    </Box>
  );
}
