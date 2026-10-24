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
import { Reveal } from '@/common/ui/motion';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { VISUALLY_HIDDEN } from '@/common/ui/visually-hidden';
import { clubCities } from '@/features/clubs/cities';
import { clubDirectoryQuery, clubsQuery } from '@/features/clubs/queries';
import { CoachCard } from '@/features/coaches/coach-cards';
import { coachesQuery } from '@/features/coaches/queries';
import HeroPoster from '@/features/home/hero-poster';
import HomeStats from '@/features/home/home-stats';
import InterestTiles from '@/features/home/interest-tiles';
import Podiums from '@/features/home/podiums';
import PopularClubs from '@/features/home/popular-clubs';
import { railSx } from '@/features/home/rail';
import SiteLife from '@/features/home/site-life';
import { homePodiumsQuery } from '@/features/home/stats-queries';
import TopPlayers from '@/features/home/top-players';
import TournamentRail from '@/features/home/tournament-rail';
import { CHOICE_PICKS, choiceQuery } from '@/features/market/players-choice-query';
import ProductGrid from '@/features/market/product-grid';
import { productsQuery } from '@/features/market/queries';

/**
 * Город лидеров и город ближайших турниров — по идентификатору справочника
 * (ADR-046). Раздельно: выбор зала рядом не должен менять рейтинг страны.
 */
const searchSchema = z.object({ city: searchId, tcity: searchId });

export const Route = createFileRoute('/_public/')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: HomePage,
});

/** Клубов и тренеров — ряд по три в средней колонке; товаров — ряд по четыре. */
const CLUBS = 3;
const COACHES = 3;
const GEAR = 4;

/**
 * Главная — портал, как у RTTF (ADR-071): под постером бренда три колонки.
 *
 * Слева турниры строками: что идёт и что ближайшее по дням. В центре итоги
 * и цифры: призёры, статистика с лучшими победами, лидеры рейтинга, клубы,
 * тренеры, инвентарь. Справа «жизнь на сайте»: форум, новости клубов, дуэли,
 * дни рождения и короткие приглашения клубам и тренерам — подробные блоки
 * переехали на страницы клубов и тренеров.
 *
 * На планшете правая колонка встаёт под левую; на телефоне всё в одну
 * колонку: турниры, итоги, жизнь сайта.
 *
 * Места «популярного» — будущие рекламные: клубы, тренеры и товары стоят
 * в порядке каталога, пока нет тарифов (бэклог рекламы, `05-state` 5).
 *
 * Пустой блок не показывается вовсе, а не пишет «нет данных»: на пилотной
 * базе главная иначе выглядела бы заброшенной.
 */
function HomePage(): ReactNode {
  const t = useT();
  const locale = useLocale();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [period, setPeriod] = useState<HomeStatsPeriod>('MONTH');

  const clubs = useQuery(clubDirectoryQuery);
  const podiums = useQuery(homePodiumsQuery);
  const popularClubs = useQuery(clubsQuery({ page: 1, limit: CLUBS }));
  const coaches = useQuery(coachesQuery({ page: 1, limit: COACHES }));
  // «Чем играют» — первая подборка «Выбора игроков» маркета, без планки.
  const gear = useQuery(productsQuery(choiceQuery(CHOICE_PICKS[0], 'all')));
  const gearItems = (gear.data?.items ?? []).filter((item) => item.playerCount > 0).slice(0, GEAR);

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
      <HeroPoster />

      {/* Ширина — как у шапки и подвала: колонки встают ровно под логотип. */}
      <Container maxWidth="lg" sx={{ pb: { xs: 8, sm: 12 } }}>
        {/* Плитки заходят на постер: первый экран и разделы — одно целое. */}
        <Box component="section" sx={{ mt: { xs: -3, md: -5 }, position: 'relative' }}>
          <Typography variant="h2" sx={VISUALLY_HIDDEN}>
            {t('home.interests.title')}
          </Typography>
          <InterestTiles />
        </Box>

        <Box
          data-home-portal
          sx={{
            mt: { xs: 5, sm: 7 },
            display: 'grid',
            gap: { xs: 5, md: 3 },
            alignItems: 'start',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              md: '264px minmax(0, 1fr)',
              lg: '264px minmax(0, 1fr) 280px',
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
          <Box component="aside" sx={{ gridArea: 'rail', minWidth: 0 }}>
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
                  <Podiums items={podiums.data?.items ?? []} />
                </Section>
              )
            )}

            <AdSlot placement="home-feed" />

            <Section title={t('home.stats.title')}>
              <HomeStats period={period} onPeriod={setPeriod} />
            </Section>

            <Section
              title={t('home.top.title')}
              more={{
                href:
                  search.city === undefined
                    ? '/players'
                    : `/players?${new URLSearchParams({ city: search.city }).toString()}`,
                label: t('home.top.all'),
              }}
            >
              <TopPlayers
                city={search.city}
                cities={cities}
                onCity={(city) => {
                  setSearch({ city });
                }}
              />
            </Section>

            {(popularClubs.data?.items.length ?? 0) > 0 && (
              <Section
                title={t('home.popularClubs.title')}
                more={{ href: '/clubs', label: t('home.popularClubs.all') }}
              >
                <PopularClubs clubs={popularClubs.data?.items ?? []} />
              </Section>
            )}

            {(coaches.data?.items.length ?? 0) > 0 && (
              <Section
                title={t('home.coaches.title')}
                more={{ href: '/trainings?view=coaches', label: t('home.coaches.all') }}
              >
                <Box component="ul" sx={railSx({ sm: 2, md: 3 })}>
                  {coaches.data?.items.map((coach, index) => (
                    <Reveal component="li" key={coach.id} delay={index * 60}>
                      <CoachCard coach={coach} />
                    </Reveal>
                  ))}
                </Box>
              </Section>
            )}

            {gearItems.length > 0 && (
              <Section
                title={t('home.gear.title')}
                more={{ href: '/market', label: t('home.gear.all') }}
              >
                <ProductGrid products={gearItems} showPlayers />
              </Section>
            )}
          </Stack>

          <Box component="aside" sx={{ gridArea: 'life', minWidth: 0 }}>
            <Typography variant="h2" sx={VISUALLY_HIDDEN}>
              {t('home.life.title')}
            </Typography>
            <SiteLife />
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
