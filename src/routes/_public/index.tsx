import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { ClubView, TournamentView } from '@kttf/shared/types';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  ArrowRight,
  CalendarDays,
  MonitorPlay,
  Search,
  TrendingUp,
  Trophy,
  WifiOff,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState, type ReactNode, type SyntheticEvent } from 'react';
import { z } from 'zod';

import { useLocale, useT } from '@/common/i18n';
import { orUndefined, searchId } from '@/common/search';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { clubCities } from '@/features/clubs/cities';
import { clubDirectoryQuery } from '@/features/clubs/queries';
import { latestNewsQuery } from '@/features/home/news';
import NewsFeed from '@/features/home/news-feed';
import TopPlayers from '@/features/home/top-players';
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

/**
 * Главная — вход в продукт для игрока и для клуба.
 *
 * Порядок блоков — порядок вопросов, с которыми сюда приходят: найти себя
 * в рейтинге, посмотреть, что идёт сейчас, куда записаться, что нового, кто
 * в лидерах. Блок для клубов последний: он для тех, кто турниры проводит.
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

  const cities = useMemo(
    () => clubCities(clubs.data?.values() ?? [], locale),
    [clubs.data, locale],
  );

  return (
    <>
      <Hero />

      <Container maxWidth="lg" sx={{ pb: { xs: 6, sm: 10 } }}>
        <Stack spacing={{ xs: 6, sm: 8 }}>
          {(running.data?.items.length ?? 0) > 0 && (
            <Section title={t('home.running.title')}>
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

          <ClubsCallout />
        </Stack>
      </Container>
    </>
  );
}

/**
 * Первый экран: что это за сайт и поиск себя в рейтинге.
 *
 * Поиск — главное действие главной и единственная залитая кнопка на ней
 * (запрет №2): игрок приходит посмотреть свой рейтинг или рейтинг соперника.
 */
function Hero(): ReactNode {
  const t = useT();
  const navigate = Route.useNavigate();
  const [query, setQuery] = useState('');

  const submit = (event: SyntheticEvent): void => {
    event.preventDefault();
    const value = orUndefined(query);
    void navigate({ to: '/players', search: value === undefined ? {} : { search: value } });
  };

  return (
    <Container maxWidth="lg" sx={{ pt: { xs: 3, sm: 5 }, mb: { xs: 5, sm: 7 } }}>
      <Paper
        variant="outlined"
        sx={{
          position: 'relative',
          overflow: 'hidden',
          px: { xs: 3, sm: 6 },
          py: { xs: 4, sm: 7 },
          // Мягкое тёплое пятно справа: глубина без картинки и без красной
          // заливки на пол-экрана.
          backgroundImage:
            'radial-gradient(circle at 92% 8%, var(--red-50) 0, transparent 42%), radial-gradient(circle at 70% 110%, var(--gold-50) 0, transparent 40%)',
        }}
      >
        <HeroBall />
        <Box sx={{ position: 'relative', maxWidth: 600 }}>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: 40, sm: 60 },
              lineHeight: { xs: '42px', sm: '60px' },
            }}
          >
            {t('page.home.title')}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 2, fontSize: 17, maxWidth: 480 }}>
            {t('page.home.lead')}
          </Typography>

          <Box
            component="form"
            role="search"
            onSubmit={submit}
            sx={{
              mt: 4,
              display: 'flex',
              gap: 1.5,
              flexDirection: { xs: 'column', sm: 'row' },
            }}
          >
            <TextField
              type="search"
              label={t('ratings.search')}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              autoComplete="off"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={18} aria-hidden />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ '& .MuiOutlinedInput-root': { minHeight: 48 } }}
            />
            <Button type="submit" variant="contained" size="large" sx={{ flexShrink: 0 }}>
              {t('home.hero.find')}
            </Button>
          </Box>

          <Stack direction="row" useFlexGap spacing={1} sx={{ mt: 3, flexWrap: 'wrap' }}>
            <QuickLink href="/tournaments" icon={CalendarDays}>
              {t('home.hero.calendar')}
            </QuickLink>
            <QuickLink href="/players" icon={TrendingUp}>
              {t('home.hero.ratings')}
            </QuickLink>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
}

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
    <Box component="section">
      <Stack
        direction="row"
        sx={{ alignItems: 'baseline', justifyContent: 'space-between', gap: 2, mb: 2 }}
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
              gap: 0.5,
              fontWeight: 600,
              color: 'text.secondary',
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
 * экран для зрителей.
 */
function ClubsCallout(): ReactNode {
  const t = useT();

  return (
    <Paper variant="outlined" sx={{ p: { xs: 3, sm: 5 } }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <IconTile icon={Trophy} />
        <Typography variant="h2">{t('home.clubs.title')}</Typography>
      </Stack>
      <Box
        component="ul"
        sx={{
          mt: 3,
          mb: 0,
          p: 0,
          listStyle: 'none',
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
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
      <Button href="/feedback" sx={{ mt: 3, minHeight: 44 }}>
        {t('home.clubs.action')}
      </Button>
    </Paper>
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

/** Быстрый переход под поиском: пилюля с иконкой. */
function QuickLink({
  href,
  icon: Icon,
  children,
}: {
  readonly href: string;
  readonly icon: LucideIcon;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <Button
      href={href}
      variant="text"
      startIcon={<Icon size={16} aria-hidden />}
      sx={{
        minHeight: 40,
        px: 2,
        borderRadius: 999,
        bgcolor: 'var(--paper)',
        border: 1,
        borderColor: 'divider',
        fontWeight: 500,
        '&:hover': { bgcolor: 'var(--paper-hover)' },
      }}
    >
      {children}
    </Button>
  );
}

/**
 * Мяч на первом экране: белый шар с тенью и кольца вокруг — фирменный
 * жест без фотографии. Только на широком экране: на телефоне место нужно
 * поиску.
 */
function HeroBall(): ReactNode {
  return (
    <Box
      aria-hidden
      sx={{
        display: { xs: 'none', md: 'block' },
        position: 'absolute',
        right: 56,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 220,
        height: 220,
        borderRadius: '50%',
        border: '1px dashed var(--line-strong)',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 36,
          borderRadius: '50%',
          border: '1px solid var(--line)',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          width: 64,
          height: 64,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #ffffff 0, #fbfbf9 40%, #e7e5df 100%)',
          boxShadow: '0 12px 28px rgb(31 31 29 / 0.16), 0 2px 6px rgb(31 31 29 / 0.08)',
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          width: 14,
          height: 14,
          borderRadius: '50%',
          bgcolor: 'var(--red-500)',
          top: 18,
          right: 38,
          boxShadow: '0 0 0 6px var(--red-50)',
        }}
      />
    </Box>
  );
}
