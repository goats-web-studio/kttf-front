import type { PlayerStatsPeriod, PlayerSummaryView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import type { UseQueryResult } from '@tanstack/react-query';
import { Building2, Flag, Swords } from 'lucide-react';
import type { ReactNode } from 'react';

import { fill, formatCount, useLocale, useT, type MessageKey } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import StatTile from '@/common/ui/stat-tile';
import Surface from '@/common/ui/surface';

import PillTabs from '@/common/ui/pill-tabs';

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
}

/**
 * «Общая статистика» — блок RTTF, ADR-048.
 *
 * Из сводки сервера: по странице встреч статистика менялась бы от
 * перелистывания. Период переключает игры, турниры и частый клуб. Место в
 * рейтинге — в плашке шапки, первый турнир и награды — в «Достижениях»
 * под шапкой: они за всё время (ADR-050, ADR-060).
 */
export default function PlayerSummary({
  summary,
  period,
  onPeriod,
}: PlayerSummaryProps): ReactNode {
  const t = useT();

  return (
    <Surface title={t('profile.stats.title')}>
      <PillTabs
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
  );
}

function Stats({ summary }: { readonly summary: PlayerSummaryView }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const none = t('profile.stats.none');
  const games = summary.wins + summary.losses;

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
      }}
    >
      <StatTile
        icon={Flag}
        label={t('profile.stats.tournaments')}
        value={<Value main={formatCount(summary.tournaments, locale)} />}
      />
      <StatTile
        icon={Swords}
        label={t('profile.stats.games')}
        value={
          <>
            <Value
              main={formatCount(games, locale)}
              note={`${formatCount(summary.wins, locale)} — ${formatCount(summary.losses, locale)}`}
            />
            {games > 0 && <WinRate wins={summary.wins} games={games} />}
          </>
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

/**
 * Доля побед полоской и процентом: «22 — 10» глазом в долю не переводится.
 * Процент — текстом рядом, полоска только помогает (07, 9).
 */
function WinRate({ wins, games }: { readonly wins: number; readonly games: number }): ReactNode {
  const t = useT();
  const percent = Math.round((wins / games) * 100);

  return (
    <Box data-win-rate sx={{ mt: 0.75, display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box
        aria-hidden
        sx={{
          flex: 1,
          minWidth: 64,
          height: 6,
          borderRadius: 999,
          bgcolor: 'var(--red-100)',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ width: `${String(percent)}%`, height: '100%', bgcolor: 'var(--ok)' }} />
      </Box>
      <Box component="span" sx={{ typography: 'body2', color: 'text.secondary' }}>
        {fill(t('profile.stats.winRate'), { percent: String(percent) })}
      </Box>
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
