import { ratingLevel } from '@kttf/shared/rating';
import { MAX_PAGE_SIZE, type AuthUserView, type TournamentStatus } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Search } from 'lucide-react';
import type { ReactNode } from 'react';

import { fill, formatCount, formatDateTime, useLocale, useT } from '@/common/i18n';
import Atmosphere from '@/common/ui/atmosphere';
import DeltaPill from '@/common/ui/delta-pill';
import LevelBadge from '@/common/ui/level-badge';
import { LEVEL_NAME } from '@/common/ui/level-name';
import PlayerAvatar from '@/common/ui/player-avatar';
import RatingValue from '@/common/ui/rating-value';
import {
  playerQuery,
  playerRatingHistoryQuery,
  playerSummaryQuery,
} from '@/features/players/queries';
import { ratingPointTitle } from '@/features/players/rating-point';
import { tournamentsQuery } from '@/features/tournaments/queries';

/** Турнир впереди или идёт: туда игрок записан. */
const AHEAD: ReadonlySet<TournamentStatus> = new Set<TournamentStatus>([
  'PUBLISHED',
  'REG_OPEN',
  'REG_CLOSED',
  'RUNNING',
]);

/**
 * Личная полоса вместо постера — у вошедшего (ADR-073).
 *
 * Постер — для того, кто пришёл впервые. Кто заходит каждый день, приходит
 * с тремя вопросами: что с моим рейтингом, куда я записан, что нового. Здесь
 * ответы на первые два; третий — лента ниже. Стиль — постера: тёмный фон
 * с красным свечением, крупное число рейтинга.
 */
export default function PersonalStrip({ user }: { readonly user: AuthUserView }): ReactNode {
  // Под постером бренда, заходя на него, как плитки у гостя (ADR-075):
  // постер остаётся у всех, своё — сразу под ним.
  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        borderRadius: 4,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-pop)',
      }}
    >
      <Atmosphere glow={[82, 20]}>
        <Box sx={{ px: { xs: 2.5, md: 4 }, py: { xs: 2.5, md: 3 } }}>
          {user.playerId === null ? <NoProfile /> : <Player playerId={user.playerId} />}
        </Box>
      </Atmosphere>
    </Box>
  );
}

function Player({ playerId }: { readonly playerId: string }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const player = useQuery(playerQuery(playerId));
  const summary = useQuery(playerSummaryQuery(playerId, 'ALL'));
  const history = useQuery(playerRatingHistoryQuery(playerId));
  const mine = useQuery(tournamentsQuery({ page: 1, limit: MAX_PAGE_SIZE, playerId }));

  if (player.data === undefined) return <Box sx={{ minHeight: 120 }} />;

  const data = player.data;
  const last = history.data?.points.at(-1);
  const next = (mine.data?.items ?? [])
    .filter((tournament) => AHEAD.has(tournament.status))
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt))[0];

  return (
    <Box
      data-personal-strip
      sx={{
        display: 'grid',
        gap: { xs: 3, md: 4 },
        alignItems: 'center',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.3fr) minmax(0, 1fr)' },
        color: 'var(--night-ink-900)',
      }}
    >
      <Stack direction="row" spacing={{ xs: 2, sm: 3 }} sx={{ alignItems: 'center', minWidth: 0 }}>
        <PlayerAvatar
          lastName={data.lastName}
          firstName={data.firstName}
          photoUrl={data.photoUrl}
          size="lg"
        />
        <Box sx={{ minWidth: 0 }}>
          <Link
            href={`/players/${playerId}`}
            color="inherit"
            underline="hover"
            sx={{ typography: 'h3', fontWeight: 700, display: 'block' }}
            noWrap
          >
            {data.lastName} {data.firstName}
          </Link>

          {data.confirmed ? (
            <Stack
              direction="row"
              spacing={2}
              useFlexGap
              sx={{ mt: 1, alignItems: 'center', flexWrap: 'wrap' }}
            >
              <Typography
                component="p"
                sx={{
                  fontSize: { xs: 40, sm: 48 },
                  lineHeight: 1,
                  fontWeight: 800,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <RatingValue value={data.rating} />
              </Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <LevelBadge rating={data.rating} tone="night" />
                <Box>
                  <Typography sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                    {t(LEVEL_NAME[ratingLevel(Number(data.rating))])}
                  </Typography>
                  {summary.data !== undefined && summary.data.rankedPlayers > 0 && (
                    <Typography variant="body2" sx={{ color: 'var(--night-ink-500)' }}>
                      {fill(t('profile.plate.rank'), {
                        rank: formatCount(summary.data.rank, locale),
                        total: formatCount(summary.data.rankedPlayers, locale),
                      })}
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Stack>
          ) : (
            <Typography sx={{ mt: 1, color: 'var(--night-ink-700)' }}>
              {t('profile.unrated.text')}
            </Typography>
          )}

          {data.confirmed &&
            last !== undefined &&
            (last.tournamentName !== null || last.duel !== null) && (
              <Stack
                direction="row"
                spacing={1}
                sx={{ mt: 1.5, alignItems: 'center', minWidth: 0 }}
              >
                <DeltaPill value={last.delta} />
                <Typography variant="body2" sx={{ color: 'var(--night-ink-500)' }} noWrap>
                  {ratingPointTitle(last, t)}
                </Typography>
              </Stack>
            )}
        </Box>
      </Stack>

      <Box
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: 3,
          bgcolor: 'rgb(255 255 255 / 0.06)',
          border: '1px solid var(--night-line)',
          minWidth: 0,
        }}
      >
        {!data.confirmed ? (
          <>
            <Typography sx={{ fontWeight: 700 }}>{t('home.strip.unrated.title')}</Typography>
            <Button href="/settings/profile" variant="contained" sx={{ mt: 1.5, minHeight: 44 }}>
              {t('home.strip.unrated.action')}
            </Button>
          </>
        ) : next === undefined ? (
          <>
            <Typography sx={{ fontWeight: 700 }}>{t('home.strip.noNext')}</Typography>
            <Button
              href="/tournaments"
              variant="contained"
              startIcon={<Search size={16} aria-hidden />}
              sx={{ mt: 1.5, minHeight: 44 }}
            >
              {t('home.strip.find')}
            </Button>
          </>
        ) : (
          <>
            <Typography
              variant="caption"
              sx={{ color: 'var(--night-ink-500)', fontWeight: 600, display: 'block' }}
            >
              {t('home.strip.next')}
            </Typography>
            <Link
              href={`/tournaments/${next.id}`}
              color="inherit"
              underline="hover"
              sx={{ mt: 0.5, display: 'block', fontWeight: 700, typography: 'h3' }}
              noWrap
            >
              {next.name}
            </Link>
            <Stack
              direction="row"
              spacing={1}
              sx={{ mt: 0.75, alignItems: 'center', color: 'var(--night-ink-700)' }}
            >
              <CalendarDays size={16} aria-hidden />
              <Typography variant="body2">{formatDateTime(next.startsAt, locale)}</Typography>
            </Stack>
            <Link
              href="/tournaments"
              underline="hover"
              sx={{ mt: 1.5, display: 'inline-block', color: 'var(--night-red)', fontWeight: 600 }}
            >
              {t('home.strip.more')}
            </Link>
          </>
        )}
      </Box>
    </Box>
  );
}

function NoProfile(): ReactNode {
  const t = useT();

  return (
    <Box data-personal-strip sx={{ color: 'var(--night-ink-900)', maxWidth: 640 }}>
      <Typography variant="h2" component="p">
        {t('cabinet.noProfile.title')}
      </Typography>
      <Typography sx={{ mt: 1, color: 'var(--night-ink-700)' }}>
        {t('cabinet.noProfile.text')}
      </Typography>
      <Button href="/settings/profile" variant="contained" sx={{ mt: 2, minHeight: 44 }}>
        {t('cabinet.noProfile.action')}
      </Button>
    </Box>
  );
}
