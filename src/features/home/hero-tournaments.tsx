import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useMemo, type ReactNode } from 'react';

import { formatDateParts, formatWeekday, useLocale, useT } from '@/common/i18n';
import { clubDirectoryQuery } from '@/features/clubs/queries';
import { useMyCity } from '@/features/places/my-city';
import { usePlaceName } from '@/features/places/place-name';
import { tournamentsQuery } from '@/features/tournaments/queries';

import { HeroColumns, HeroEyebrow, HeroFrame, HeroTitle, NightCard } from './hero-frame';
import { NIGHT_MUTED, NIGHT_ROW, rise } from './hero-style';
import LiveSearch from './live-search';

/** Турниров в карточке: дальше — календарь. */
const NEXT = 3;

/** Ещё не начавшиеся: объявлен, запись открыта или закрыта — как в колонке турниров. */
const NOT_STARTED = ['PUBLISHED', 'REG_OPEN', 'REG_CLOSED'] as const;

/**
 * Вариант B «Поиск и ближайшие турниры»: слева поиск, справа три
 * ближайших турнира города шапки (без города — всех городов). На телефоне
 * карточка встаёт под поиск.
 */
export default function HeroTournaments(): ReactNode {
  return (
    <HeroFrame glow={[28, 70]}>
      <HeroColumns
        start={
          <>
            <HeroEyebrow align="start" />
            <HeroTitle align="start" />
            <Box {...rise(160)} sx={{ mt: 3 }}>
              <LiveSearch align="start" />
            </Box>
          </>
        }
        end={<NextTournaments />}
      />
    </HeroFrame>
  );
}

function NextTournaments(): ReactNode {
  const t = useT();
  const locale = useLocale();
  const placeName = usePlaceName();
  const myCity = useMyCity();
  const clubs = useQuery(clubDirectoryQuery);

  // Начало суток, а не «сейчас»: момент в ключе запроса менялся бы на каждом рендере.
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  }, []);

  const upcoming = useQuery(
    tournamentsQuery({
      status: NOT_STARTED,
      from: today,
      order: 'asc',
      page: 1,
      limit: NEXT,
      ...(myCity === null ? {} : { cityId: [myCity.id] }),
    }),
  );
  const items = (upcoming.data?.items ?? []).slice(0, NEXT);

  return (
    <NightCard
      data="tournaments"
      title={t('home.upcoming.title')}
      subtitle={myCity === null ? t('home.upcoming.allCities') : placeName(myCity)}
      action={{ href: '/tournaments', label: t('home.hero.calendar') }}
    >
      {upcoming.isPending ? (
        <Box role="status" aria-label={t('common.loading')} sx={{ px: 2, pb: 1.5 }}>
          {Array.from({ length: NEXT }, (_, index) => (
            <Skeleton
              key={index}
              variant="rounded"
              height={44}
              sx={{ mt: 1, bgcolor: 'var(--night-raised)' }}
            />
          ))}
        </Box>
      ) : items.length === 0 ? (
        <Typography
          sx={{
            px: 2,
            py: 2,
            borderTop: '1px solid var(--night-line)',
            fontSize: 14,
            color: 'var(--night-ink-700)',
          }}
        >
          {t('home.upcoming.empty')}{' '}
          <Link href="/tournaments" sx={{ color: 'var(--night-ink-900)', fontWeight: 600 }}>
            {t('home.hero.toCalendar')}
          </Link>
        </Typography>
      ) : (
        <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
          {items.map((tournament) => {
            const parts = formatDateParts(tournament.startsAt, locale);
            const club = clubs.data?.get(tournament.clubId);

            return (
              <Box
                component="li"
                key={tournament.id}
                data-tournament={tournament.id}
                sx={{ ...NIGHT_ROW, gridTemplateColumns: '48px minmax(0, 1fr)', py: 1.25 }}
              >
                <Box
                  sx={{
                    textAlign: 'center',
                    lineHeight: 1.1,
                    py: 0.5,
                    borderRadius: 2,
                    bgcolor: 'var(--night-raised)',
                  }}
                >
                  <Box sx={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {parts.day}
                  </Box>
                  <Box sx={{ fontSize: 12, color: 'var(--night-ink-500)' }}>{parts.month}</Box>
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Link
                    data-row-link
                    href={`/tournaments/${tournament.id}`}
                    underline="none"
                    sx={{
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: 14,
                      fontWeight: 600,
                      lineHeight: 1.4,
                      color: 'var(--night-ink-900)',
                    }}
                  >
                    {tournament.name}
                  </Link>
                  <Box sx={NIGHT_MUTED}>
                    {[
                      `${formatWeekday(new Date(tournament.startsAt), locale, 'short')}, ${parts.time}`,
                      club === undefined ? undefined : (club.shortName ?? club.name),
                    ]
                      .filter((part) => part !== undefined)
                      .join(' · ')}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </NightCard>
  );
}
