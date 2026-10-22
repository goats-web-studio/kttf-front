import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ClubView, TournamentView } from '@kttf/shared/types';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  ArrowRight,
  MonitorPlay,
  TrendingUp,
  Trophy,
  WifiOff,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { z } from 'zod';

import { useLocale, useT } from '@/common/i18n';
import { searchId } from '@/common/search';
import AdSlot from '@/common/ui/ad-slot';
import { RowsSkeleton } from '@/common/ui/skeleton';
import TableArt from '@/common/ui/table-art';
import { VISUALLY_HIDDEN } from '@/common/ui/visually-hidden';
import { clubCities } from '@/features/clubs/cities';
import { clubDirectoryQuery, clubsQuery } from '@/features/clubs/queries';
import { CoachCard } from '@/features/coaches/coach-cards';
import { coachesQuery } from '@/features/coaches/queries';
import HeroPoster from '@/features/home/hero-poster';
import InterestTiles from '@/features/home/interest-tiles';
import { latestNewsQuery } from '@/features/home/news';
import NewsFeed from '@/features/home/news-feed';
import PopularClubs from '@/features/home/popular-clubs';
import { railSx } from '@/features/home/rail';
import TopPlayers from '@/features/home/top-players';
import { CHOICE_PICKS, choiceQuery } from '@/features/market/players-choice-query';
import ProductGrid from '@/features/market/product-grid';
import { productsQuery } from '@/features/market/queries';
import { tournamentsQuery } from '@/features/tournaments/queries';
import TournamentCard from '@/features/tournaments/tournament-card';

/** Город лидеров — по идентификатору справочника (ADR-046). */
const searchSchema = z.object({ city: searchId });

export const Route = createFileRoute('/_public/')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: HomePage,
});

/** Сколько карточек турниров в блоке. Полный список — в календаре. */
const CARDS = 4;
/** Клубов — два ряда по три; тренеров и товаров — один ряд по четыре. */
const CLUBS = 6;
const ROW = 4;

/**
 * Главная — вход в продукт для игрока, новичка с рекламы и клуба.
 *
 * Сверху вниз: постер бренда с поиском игрока; плитки «что вас интересует»
 * — вход в разделы словами о деле; живое — что идёт и куда записаться;
 * популярные клубы; итоги рядом с лидерами рейтинга; тренеры; чем играют;
 * блок для клубов последним — он для тех, кто турниры проводит.
 *
 * Места «популярного» — будущие рекламные: клубы, тренеры и товары стоят
 * в порядке каталога, пока нет тарифов и продвижения (бэклог рекламы,
 * `05-state` 5). Слот `home-feed` стоит между живым и итогами и пока
 * ничего не выводит.
 *
 * Пустой блок не показывается вовсе, а не пишет «нет данных»: на пилотной
 * базе главная иначе выглядела бы заброшенной. Исключение — ошибка
 * загрузки: о ней молчать нельзя, и её показывает сам раздел.
 */
function HomePage(): ReactNode {
  const t = useT();
  const locale = useLocale();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  // Начало суток, а не «сейчас»: момент в ключе запроса менялся бы на каждом
  // рендере, и кэш не работал бы. Турнир, начавшийся сегодня утром, тоже
  // ещё «ближайший».
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  }, []);

  const running = useQuery(tournamentsQuery({ status: 'RUNNING', page: 1, limit: CARDS }));
  const upcoming = useQuery(
    tournamentsQuery({ status: 'REG_OPEN', from: today, page: 1, limit: CARDS }),
  );
  const news = useQuery(latestNewsQuery);
  const clubs = useQuery(clubDirectoryQuery);
  const popularClubs = useQuery(clubsQuery({ page: 1, limit: CLUBS }));
  const coaches = useQuery(coachesQuery({ page: 1, limit: ROW }));
  // «Чем играют» — первая подборка «Выбора игроков» маркета, без планки.
  const gear = useQuery(productsQuery(choiceQuery(CHOICE_PICKS[0], 'all')));
  const gearItems = (gear.data?.items ?? []).filter((item) => item.playerCount > 0).slice(0, ROW);

  const cities = useMemo(
    () => clubCities(clubs.data?.values() ?? [], locale),
    [clubs.data, locale],
  );

  return (
    <>
      <HeroPoster />

      <Container maxWidth="lg" sx={{ pb: { xs: 8, sm: 12 } }}>
        {/* Плитки заходят на постер: первый экран и разделы — одно целое. */}
        <Box component="section" sx={{ mt: { xs: -3, md: -5 }, position: 'relative' }}>
          <Typography variant="h2" sx={VISUALLY_HIDDEN}>
            {t('home.interests.title')}
          </Typography>
          <InterestTiles />
        </Box>

        <Stack spacing={{ xs: 7, sm: 10 }} sx={{ mt: { xs: 7, sm: 10 } }}>
          {(running.data?.items.length ?? 0) > 0 && (
            <Section title={t('home.running.title')} live>
              <TournamentList items={running.data?.items ?? []} clubs={clubs.data} />
            </Section>
          )}

          {upcoming.isPending ? (
            <Section title={t('home.upcoming.title')}>
              <RowsSkeleton rows={3} />
            </Section>
          ) : (
            (upcoming.data?.items.length ?? 0) > 0 && (
              <Section
                title={t('home.upcoming.title')}
                more={{ href: '/tournaments?status=REG_OPEN', label: t('home.upcoming.all') }}
              >
                <TournamentList items={upcoming.data?.items ?? []} clubs={clubs.data} />
              </Section>
            )
          )}

          {(popularClubs.data?.items.length ?? 0) > 0 && (
            <Section
              title={t('home.popularClubs.title')}
              more={{ href: '/clubs', label: t('home.popularClubs.all') }}
            >
              <PopularClubs clubs={popularClubs.data?.items ?? []} />
            </Section>
          )}

          <AdSlot placement="home-feed" />

          {/* Итоги и лидеры рядом: оба отвечают на «что нового в игре», и
              по отдельности каждый был длинной лентой на всю ширину. */}
          <Box
            sx={{
              display: 'grid',
              gap: { xs: 7, md: 4 },
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 7fr) minmax(0, 5fr)' },
              alignItems: 'start',
            }}
          >
            {(news.data?.length ?? 0) > 0 && (
              <Section
                title={t('home.news.title')}
                more={{ href: '/tournaments?status=RATED', label: t('home.news.all') }}
              >
                <NewsFeed items={news.data ?? []} />
              </Section>
            )}

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
                  void navigate({ search: { city }, replace: true, resetScroll: false });
                }}
              />
            </Section>
          </Box>

          {(coaches.data?.items.length ?? 0) > 0 && (
            <Section
              title={t('home.coaches.title')}
              more={{ href: '/trainings?view=coaches', label: t('home.coaches.all') }}
            >
              <Box component="ul" sx={railSx({ sm: 2, md: 4 })}>
                {coaches.data?.items.map((coach) => (
                  <Box component="li" key={coach.id}>
                    <CoachCard coach={coach} />
                  </Box>
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

          <ClubsCallout />
        </Stack>
      </Container>
    </>
  );
}

/**
 * Раздел главной: заголовок с красной чертой под фирменным наклоном 9°,
 * ссылка «все» справа. У «Идёт сейчас» черта мигает — турнир в эту минуту.
 */
function Section({
  title,
  more,
  live = false,
  children,
}: {
  readonly title: string;
  readonly more?: { readonly href: string; readonly label: string };
  readonly live?: boolean;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <Box component="section" sx={{ minWidth: 0 }}>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2.5 }}
      >
        <Typography variant="h2" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            component="span"
            aria-hidden
            sx={{
              width: 6,
              height: 22,
              borderRadius: 1,
              bgcolor: 'var(--red-500)',
              transform: 'skewX(-9deg)',
              flexShrink: 0,
              ...(live && {
                animation: 'kttf-live 1.6s var(--ease) infinite',
                '@keyframes kttf-live': { '50%': { opacity: 0.35 } },
              }),
            }}
          />
          {title}
        </Typography>
        {more !== undefined && (
          <Link
            href={more.href}
            variant="body2"
            underline="none"
            sx={{
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              minHeight: 44,
              fontWeight: 600,
              color: 'text.secondary',
              '&:hover': { color: 'var(--red-600)' },
            }}
          >
            {more.label}
            <ArrowRight size={16} aria-hidden />
          </Link>
        )}
      </Stack>
      {children}
    </Box>
  );
}

function TournamentList({
  items,
  clubs,
}: {
  readonly items: readonly TournamentView[];
  readonly clubs: ReadonlyMap<string, ClubView> | undefined;
}): ReactNode {
  return (
    <Box
      component="ul"
      sx={{
        listStyle: 'none',
        m: 0,
        p: 0,
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
      }}
    >
      {items.map((tournament) => (
        <Box component="li" key={tournament.id}>
          <TournamentCard tournament={tournament} club={clubs?.get(tournament.clubId)} />
        </Box>
      ))}
    </Box>
  );
}

/**
 * Для клубов: зачем проводить турниры здесь. Три довода — ровно то, чего нет
 * у таблицы в мессенджере: зал без интернета, рейтинг без ручного счёта,
 * экран для зрителей. Справа — стол сверху тем же рисунком, что под верхом
 * страниц: блок про зал, и рисунок про зал.
 */
function ClubsCallout(): ReactNode {
  const t = useT();

  return (
    <Paper
      variant="outlined"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        p: { xs: 3, sm: 5 },
        backgroundImage:
          'radial-gradient(ellipse 50% 80% at 100% 0%, var(--red-50) 0, transparent 70%)',
      }}
    >
      <CalloutTable />
      <Stack direction="row" spacing={1.5} sx={{ position: 'relative', alignItems: 'center' }}>
        <IconTile icon={Trophy} />
        <Typography variant="h2">{t('home.clubs.title')}</Typography>
      </Stack>
      <Box
        component="ul"
        sx={{
          position: 'relative',
          mt: 3,
          mb: 0,
          p: 0,
          listStyle: 'none',
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          maxWidth: { md: '78%' },
        }}
      >
        {(
          [
            ['offline', WifiOff],
            ['rating', TrendingUp],
            ['screen', MonitorPlay],
          ] as const
        ).map(([point, icon]) => (
          <Box
            component="li"
            key={point}
            sx={{ p: 2.5, borderRadius: 3, bgcolor: 'var(--paper-sunken)' }}
          >
            <IconTile icon={icon} />
            <Typography variant="h3" sx={{ mt: 1.5 }}>
              {t(`home.clubs.${point}.title`)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t(`home.clubs.${point}.text`)}
            </Typography>
          </Box>
        ))}
      </Box>
      {/* Заявка клуба — своей страницей с формой (ADR-047): раньше кнопка
          уводила в Instagram, и заявка терялась в личных сообщениях. */}
      <Button href="/feedback" sx={{ position: 'relative', mt: 3, minHeight: 44 }}>
        {t('home.clubs.action')}
      </Button>
    </Paper>
  );
}

/** Стол сверху в углу блока для клубов. Декор, только на широком экране. */
function CalloutTable(): ReactNode {
  return (
    <Box
      aria-hidden
      sx={{
        display: { xs: 'none', md: 'block' },
        position: 'absolute',
        right: -40,
        bottom: -30,
        width: 300,
        pointerEvents: 'none',
        '& svg': { display: 'block', width: '100%', height: 'auto' },
      }}
    >
      <TableArt />
    </Box>
  );
}

/** Иконка в белой плашке — довод в блоке для клубов. Декоративна. */
function IconTile({ icon: Icon }: { readonly icon: LucideIcon }): ReactNode {
  return (
    <Box
      aria-hidden
      sx={{
        width: 40,
        height: 40,
        flexShrink: 0,
        borderRadius: 3,
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'var(--paper)',
        color: 'var(--red-600)',
        boxShadow: '0 1px 2px rgb(31 31 29 / 0.08), 0 2px 8px rgb(31 31 29 / 0.06)',
      }}
    >
      <Icon size={20} strokeWidth={2} />
    </Box>
  );
}
