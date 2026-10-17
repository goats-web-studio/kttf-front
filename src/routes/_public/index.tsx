import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { ClubView, TournamentView } from '@kttf/shared/types';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
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

/** Внешний канал федерации — тот же, что в подвале. */
const INSTAGRAM = 'https://www.instagram.com/kttf.kz';

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

      <Container maxWidth="md" sx={{ pb: { xs: 6, sm: 10 } }}>
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
                  ? '/ratings'
                  : `/ratings?${new URLSearchParams({ city: search.city }).toString()}`,
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
    void navigate({ to: '/ratings', search: value === undefined ? {} : { search: value } });
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: { xs: 5, sm: 8 } }}>
      <Container maxWidth="md" sx={{ py: { xs: 6, sm: 10 } }}>
        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: 44, sm: 64 },
            lineHeight: { xs: '44px', sm: '60px' },
            maxWidth: 640,
          }}
        >
          {t('page.home.title')}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 2, fontSize: 17, maxWidth: 520 }}>
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
            maxWidth: 560,
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
          />
          <Button type="submit" variant="contained" sx={{ minHeight: 44, flexShrink: 0 }}>
            {t('home.hero.find')}
          </Button>
        </Box>

        <Stack direction="row" spacing={3} sx={{ mt: 3 }}>
          <Link href="/tournaments">{t('home.hero.calendar')}</Link>
          <Link href="/ratings">{t('home.hero.ratings')}</Link>
        </Stack>
      </Container>
    </Box>
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
          <Link href={more.href} variant="body2" sx={{ whiteSpace: 'nowrap' }}>
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
      sx={{ listStyle: 'none', m: 0, p: 0, borderTop: 1, borderColor: 'divider' }}
    >
      {items.map((tournament) => (
        <Box component="li" key={tournament.id} sx={{ borderBottom: 1, borderColor: 'divider' }}>
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
      <Typography variant="h2">{t('home.clubs.title')}</Typography>
      <Box
        component="ul"
        sx={{
          mt: 3,
          mb: 0,
          p: 0,
          listStyle: 'none',
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
        }}
      >
        {(['offline', 'rating', 'screen'] as const).map((point) => (
          <Box component="li" key={point}>
            <Typography variant="h3">{t(`home.clubs.${point}.title`)}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t(`home.clubs.${point}.text`)}
            </Typography>
          </Box>
        ))}
      </Box>
      <Button href={INSTAGRAM} target="_blank" rel="noreferrer" sx={{ mt: 4, minHeight: 44 }}>
        {t('home.clubs.action')}
      </Button>
    </Paper>
  );
}
