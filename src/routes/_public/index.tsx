import type { HomeStatsPeriod } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState, type ReactNode } from 'react';
import { z } from 'zod';

import { useLocale, useT } from '@/common/i18n';
import { searchId } from '@/common/search';
import AdSlot from '@/common/ui/ad-slot';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { VISUALLY_HIDDEN } from '@/common/ui/visually-hidden';
import { useSessionStore } from '@/features/auth/session-store';
import { clubCities } from '@/features/clubs/cities';
import { clubDirectoryQuery } from '@/features/clubs/queries';
import FeedSection from '@/features/feed/feed-section';
import FollowSuggestions from '@/features/follows/suggestions';
import HeroPoster from '@/features/home/hero-poster';
import HomeStats from '@/features/home/home-stats';
import InterestTiles from '@/features/home/interest-tiles';
import PersonalStrip from '@/features/home/personal-strip';
import Podiums from '@/features/home/podiums';
import RatingLeaders from '@/features/home/rating-leaders';
import SiteLife from '@/features/home/site-life';
import { homePodiumsQuery } from '@/features/home/stats-queries';
import TournamentRail from '@/features/home/tournament-rail';

/**
 * Город лидеров и город ближайших турниров — по идентификатору справочника
 * (ADR-046). Раздельно: выбор зала рядом не должен менять рейтинг страны.
 */
const searchSchema = z.object({ city: searchId, tcity: searchId });

export const Route = createFileRoute('/_public/')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: HomePage,
});

/** Призёров в центре — два ряда по три: дальше уже архив, он в турнирах. */
const PODIUMS = 6;

/**
 * Главная — ADR-071, ADR-073.
 *
 * Гостю — постер бренда и плитки разделов: он пришёл узнать, что это.
 * Вошедшему — личная полоса: рейтинг, уровень, куда записан.
 *
 * Ниже три колонки. Слева турниры строками: что идёт и что ближайшее по
 * дням. В центре — интересное: итоги с призёрами, статистика и лучшие
 * победы, под ними лента — новости и акции клубов и тренеров, новости
 * KTTF, турниры, события и записи игроков. Справа — короткое: лидеры
 * рейтинга, на кого подписаться, жизнь на форуме, дуэли, дни рождения.
 *
 * На планшете правая колонка встаёт под левую; на телефоне всё в одну
 * колонку: турниры, итоги, лента, остальное.
 *
 * Пустой блок не показывается вовсе, а не пишет «нет данных»: на пилотной
 * базе главная иначе выглядела бы заброшенной.
 */
function HomePage(): ReactNode {
  const t = useT();
  const locale = useLocale();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const user = useSessionStore((state) => state.user);
  const [period, setPeriod] = useState<HomeStatsPeriod>('MONTH');

  const clubs = useQuery(clubDirectoryQuery);
  const podiums = useQuery(homePodiumsQuery);

  const cities = useMemo(
    () => clubCities(clubs.data?.values() ?? [], locale),
    [clubs.data, locale],
  );

  const setSearch = (next: Partial<typeof search>) => {
    void navigate({
      search: (previous) => ({ ...previous, ...next }),
      replace: true,
      resetScroll: false,
    });
  };

  return (
    <>
      {user === null ? <HeroPoster /> : <PersonalStrip user={user} />}

      {/* Ширина — как у шапки и подвала: колонки встают ровно под логотип. */}
      <Container maxWidth="lg" sx={{ pb: { xs: 8, sm: 12 } }}>
        {user === null && (
          // Плитки заходят на постер: первый экран и разделы — одно целое.
          <Box component="section" sx={{ mt: { xs: -3, md: -5 }, position: 'relative' }}>
            <Typography variant="h2" sx={VISUALLY_HIDDEN}>
              {t('home.interests.title')}
            </Typography>
            <InterestTiles />
          </Box>
        )}

        <Box
          data-home-portal
          sx={{
            mt: user === null ? { xs: 5, sm: 7 } : { xs: 4, sm: 5 },
            position: 'relative',
            display: 'grid',
            gap: { xs: 5, md: 3 },
            alignItems: 'start',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              md: '264px minmax(0, 1fr)',
              lg: '264px minmax(0, 1fr) 300px',
            },
            // На планшете центр занимает обе строки; без `auto 1fr` первая
            // строка растягивалась бы под него, и между турнирами и жизнью
            // сайта зиял бы разрыв.
            gridTemplateRows: { md: 'auto 1fr', lg: 'auto' },
            gridTemplateAreas: {
              xs: '"rail" "main" "life"',
              md: '"rail main" "life main"',
              lg: '"rail main life"',
            },
          }}
        >
          <Box
            component="aside"
            sx={{
              gridArea: 'rail',
              minWidth: 0,
              // Турниры под рукой, пока листается лента.
              position: { lg: 'sticky' },
              top: { lg: 88 },
            }}
          >
            <Typography variant="h2" sx={VISUALLY_HIDDEN}>
              {t('home.rail.title')}
            </Typography>
            <TournamentRail
              city={search.tcity}
              cities={cities}
              onCity={(tcity) => {
                setSearch({ tcity });
              }}
              clubs={clubs.data}
            />
          </Box>

          <Stack spacing={{ xs: 6, sm: 7 }} sx={{ gridArea: 'main', minWidth: 0 }}>
            {podiums.isPending ? (
              <Section title={t('home.results.title')}>
                <RowsSkeleton rows={3} />
              </Section>
            ) : (
              (podiums.data?.items.length ?? 0) > 0 && (
                <Section
                  title={t('home.results.title')}
                  more={{ href: '/tournaments?status=RATED', label: t('home.results.all') }}
                >
                  <Podiums items={(podiums.data?.items ?? []).slice(0, PODIUMS)} />
                </Section>
              )
            )}

            <Section title={t('home.stats.title')}>
              <HomeStats period={period} onPeriod={setPeriod} />
            </Section>

            <AdSlot placement="home-feed" />

            <Section title={t('feed.title')} more={{ href: '/forum', label: t('feed.forum') }}>
              <FeedSection />
            </Section>
          </Stack>

          <Box component="aside" sx={{ gridArea: 'life', minWidth: 0 }}>
            <Typography variant="h2" sx={VISUALLY_HIDDEN}>
              {t('home.life.title')}
            </Typography>
            <Box sx={{ display: 'grid', gap: 3, alignContent: 'start' }}>
              <RatingLeaders />
              <FollowSuggestions />
              <SiteLife />
            </Box>
          </Box>
        </Box>
      </Container>
    </>
  );
}

/** Раздел средней колонки: заголовок и ссылка «все» справа. */
function Section({
  title,
  more,
  children,
}: {
  readonly title: string;
  readonly more?: { readonly href: string; readonly label: string };
  readonly children: ReactNode;
}): ReactNode {
  return (
    <Box component="section" sx={{ minWidth: 0 }}>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}
      >
        <Typography variant="h2">{title}</Typography>
        {more !== undefined && (
          <Link
            href={more.href}
            variant="body2"
            underline="none"
            sx={{
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              minHeight: 44,
              fontWeight: 600,
              color: 'text.secondary',
              '&:hover': { color: 'var(--red-600)' },
            }}
          >
            {more.label}
          </Link>
        )}
      </Stack>
      {children}
    </Box>
  );
}
