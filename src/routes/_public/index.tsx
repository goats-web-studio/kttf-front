import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ClubView, TournamentView } from '@kttf/shared/types';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarClock,
  Inbox,
  Medal,
  Megaphone,
  MessageCircle,
  TrendingUp,
  UserRound,
  Users,
  WifiOff,
} from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { z } from 'zod';

import { useLocale, useT } from '@/common/i18n';
import { searchId } from '@/common/search';
import AdSlot from '@/common/ui/ad-slot';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { VISUALLY_HIDDEN } from '@/common/ui/visually-hidden';
import { Reveal } from '@/common/ui/motion';
import { clubCities } from '@/features/clubs/cities';
import { clubDirectoryQuery, clubsQuery } from '@/features/clubs/queries';
import { CoachCard } from '@/features/coaches/coach-cards';
import { coachesQuery } from '@/features/coaches/queries';
import { forumTopicsQuery } from '@/features/forum/queries';
import TopicRow from '@/features/forum/topic-row';
import HeroPoster from '@/features/home/hero-poster';
import InterestTiles from '@/features/home/interest-tiles';
import { latestNewsQuery } from '@/features/home/news';
import NewsFeed from '@/features/home/news-feed';
import PartnerCallout, { type PartnerPoint } from '@/features/home/partner-callout';
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
/** Тем форума на главной. */
const FORUM_TOPICS = 5;

/**
 * Что клуб получает в KTTF — только то, что уже работает (`05-state` 4):
 * турниры, страница, связь, заявки, тренировки, контент, статистика.
 */
const CLUB_POINTS: readonly PartnerPoint[] = [
  { key: 'offline', icon: WifiOff },
  { key: 'rating', icon: TrendingUp },
  { key: 'page', icon: Building2 },
  { key: 'contact', icon: MessageCircle },
  { key: 'requests', icon: Inbox },
  { key: 'trainings', icon: Users },
  { key: 'content', icon: Megaphone },
  { key: 'stats', icon: BarChart3 },
];

/** Что тренер получает в KTTF — ADR-059, `docs/11` 3.1–3.3, сделанное. */
const COACH_POINTS: readonly PartnerPoint[] = [
  { key: 'page', icon: UserRound },
  { key: 'verified', icon: BadgeCheck },
  { key: 'trainings', icon: CalendarClock },
  { key: 'requests', icon: Inbox },
  { key: 'students', icon: Medal },
  { key: 'content', icon: Megaphone },
  { key: 'contact', icon: MessageCircle },
  { key: 'stats', icon: BarChart3 },
];

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
  const forum = useQuery(forumTopicsQuery({ limit: FORUM_TOPICS }));

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
                {coaches.data?.items.map((coach, index) => (
                  <Reveal component="li" key={coach.id} delay={index * 60}>
                    <CoachCard coach={coach} />
                  </Reveal>
                ))}
              </Box>
            </Section>
          )}

          {/* Сразу под тренерами: кто смотрит тренеров, сам может им быть.
              Кнопка ведёт в кабинет; гостя страница входа вернёт обратно. */}
          <PartnerCallout
            prefix="home.coachCta"
            points={COACH_POINTS}
            steps={4}
            action={{ href: '/cabinet/coach', label: 'home.coachCta.action' }}
            more={{ href: '/trainings?view=coaches', label: 'home.coaches.all' }}
          />

          {gearItems.length > 0 && (
            <Section
              title={t('home.gear.title')}
              more={{ href: '/market', label: t('home.gear.all') }}
            >
              <ProductGrid products={gearItems} showPlayers />
            </Section>
          )}

          {/* Форум — свежие темы всех разделов (ADR-064, F2). Пустой не выводится. */}
          {(forum.data?.items.length ?? 0) > 0 && (
            <Section
              title={t('home.forum.title')}
              more={{ href: '/forum', label: t('home.forum.all') }}
            >
              <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                <Box component="ul" sx={{ m: 0, p: 0 }} data-home-forum>
                  {forum.data?.items.map((topic) => (
                    <TopicRow key={topic.id} topic={topic} showSection />
                  ))}
                </Box>
              </Paper>
            </Section>
          )}

          {/* Заявка клуба — своей страницей с формой (ADR-047), без входа. */}
          <PartnerCallout
            prefix="home.clubs"
            points={CLUB_POINTS}
            steps={4}
            action={{ href: '/feedback', label: 'clubs.apply' }}
            more={{ href: '/clubs', label: 'home.popularClubs.all' }}
          />
        </Stack>
      </Container>
    </>
  );
}

/**
 * Раздел главной: заголовок и ссылка «все» справа. Красная метка — только у
 * «Идёт сейчас»: это единственный раздел про «прямо сейчас», и одна метка
 * на страницу читается как знак, а шесть одинаковых — как шаблон.
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
        <Typography variant="h2" sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          {live && (
            <Box
              component="span"
              aria-hidden
              sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'var(--red-600)' }}
            />
          )}
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
      {items.map((tournament, index) => (
        <Reveal component="li" key={tournament.id} delay={index * 60}>
          <TournamentCard tournament={tournament} club={clubs?.get(tournament.clubId)} />
        </Reveal>
      ))}
    </Box>
  );
}
