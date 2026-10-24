import type { CityRef, ClubView, TournamentListItemView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useQuery } from '@tanstack/react-query';
import { useMemo, type ReactNode } from 'react';

import { formatWeekday, useLocale, useT, type Locale } from '@/common/i18n';
import { RowsSkeleton } from '@/common/ui/skeleton';
import Surface from '@/common/ui/surface';
import { usePlaceName } from '@/features/places/place-name';
import { tournamentsQuery } from '@/features/tournaments/queries';
import RatingCapBadge from '@/features/tournaments/rating-cap-badge';
import { Participants, StartTime, TournamentName } from '@/features/tournaments/tournament-line';

/** Идущих турниров в колонке — больше в один день у пилота не бывает. */
const LIVE = 12;
/** Ближайших — на неделю-две вперёд; дальше — календарь. */
const UPCOMING = 40;
/** На телефоне колонка стоит в потоке страницы: длинный список её бы утопил. */
const UPCOMING_MOBILE = 6;

/** Ещё не начавшиеся: объявлен, запись открыта или закрыта. */
const NOT_STARTED = ['PUBLISHED', 'REG_OPEN', 'REG_CLOSED'] as const;

interface TournamentRailProps {
  /** Город ближайших по `id`; `undefined` — все города. Живёт в адресе главной. */
  readonly city: string | undefined;
  readonly cities: readonly CityRef[];
  readonly onCity: (city: string | undefined) => void;
  readonly clubs: ReadonlyMap<string, ClubView> | undefined;
}

/**
 * Левая колонка главной — турниры строками, как у RTTF (ADR-071): «Турниры
 * live» и «Ближайшие» по дням. Строка — время, планка, название, клуб и
 * участники; та же раскладка, что в клетке календаря, чтобы турнир везде
 * читался одинаково.
 */
export default function TournamentRail({
  city,
  cities,
  onCity,
  clubs,
}: TournamentRailProps): ReactNode {
  return (
    <Box sx={{ display: 'grid', gap: 3, alignContent: 'start' }}>
      <Live clubs={clubs} />
      <Upcoming city={city} cities={cities} onCity={onCity} clubs={clubs} />
    </Box>
  );
}

function Live({ clubs }: { readonly clubs: ReadonlyMap<string, ClubView> | undefined }): ReactNode {
  const t = useT();
  const running = useQuery(
    tournamentsQuery({ status: 'RUNNING', order: 'asc', page: 1, limit: LIVE }),
  );
  const items = running.data?.items ?? [];

  // Пусто — блока нет: «сейчас ничего не идёт» на главной читается как заброшенность.
  if (items.length === 0) return null;

  return (
    <Surface
      flush
      title={
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
          <Box
            component="span"
            aria-hidden
            sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'var(--red-600)' }}
          />
          {t('home.live.title')}
        </Box>
      }
    >
      <Rows items={items} clubs={clubs} data="live" />
    </Surface>
  );
}

function Upcoming({
  city,
  cities,
  onCity,
  clubs,
}: Omit<TournamentRailProps, 'clubs'> & {
  readonly clubs: ReadonlyMap<string, ClubView> | undefined;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const placeName = usePlaceName();
  const mobile = useMediaQuery((theme) => theme.breakpoints.down('md'));

  // Начало суток, а не «сейчас»: момент в ключе запроса менялся бы на каждом
  // рендере. Турнир, начавшийся сегодня утром и не запущенный, тоже ближайший.
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
      limit: UPCOMING,
      ...(city === undefined ? {} : { cityId: city }),
    }),
  );
  const items = (upcoming.data?.items ?? []).slice(0, mobile ? UPCOMING_MOBILE : UPCOMING);
  const days = useMemo(() => groupByDay(items, locale), [items, locale]);

  return (
    <Surface
      flush
      title={t('home.upcoming.title')}
      action={
        <Link href="/tournaments" variant="body2" underline="hover" sx={{ whiteSpace: 'nowrap' }}>
          {t('home.upcoming.all')}
        </Link>
      }
    >
      {cities.length > 1 && (
        <Box sx={{ px: 2, pb: 1.5 }}>
          <TextField
            select
            size="small"
            fullWidth
            label={t('home.upcoming.city')}
            value={city ?? ''}
            onChange={(event) => {
              onCity(event.target.value === '' ? undefined : event.target.value);
            }}
          >
            <MenuItem value="">{t('home.upcoming.allCities')}</MenuItem>
            {cities.map((item) => (
              <MenuItem key={item.id} value={item.id}>
                {placeName(item)}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      )}

      {upcoming.isPending ? (
        <Box sx={{ px: 2, pb: 2 }}>
          <RowsSkeleton rows={4} />
        </Box>
      ) : days.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 2 }}>
          {t('home.upcoming.empty')}
        </Typography>
      ) : (
        <Box data-home-upcoming>
          {days.map((day) => (
            <Box key={day.key} component="section">
              <Typography
                variant="body2"
                component="h3"
                sx={{
                  px: 2,
                  py: 0.75,
                  fontWeight: 700,
                  bgcolor: 'var(--paper-sunken)',
                  borderTop: '1px solid var(--line)',
                }}
              >
                {day.label}
              </Typography>
              <Rows items={day.items} clubs={clubs} />
            </Box>
          ))}
        </Box>
      )}
    </Surface>
  );
}

/** «сб 25.10» — день недели и число, как в шапке дня у RTTF. */
function groupByDay(
  items: readonly TournamentListItemView[],
  locale: Locale,
): { key: string; label: string; items: TournamentListItemView[] }[] {
  const days = new Map<string, { key: string; label: string; items: TournamentListItemView[] }>();

  for (const item of items) {
    const date = new Date(item.startsAt);
    const key = `${String(date.getFullYear())}-${String(date.getMonth())}-${String(date.getDate())}`;
    const day = days.get(key) ?? {
      key,
      label: `${formatWeekday(date, locale, 'short')} ${new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
      }).format(date)}`,
      items: [],
    };

    day.items.push(item);
    days.set(key, day);
  }

  return [...days.values()];
}

/**
 * Строки турниров: время и планка столбиком слева, название и клуб с
 * участниками справа — две строки ровной высоты, как в клетке календаря.
 */
function Rows({
  items,
  clubs,
  data,
}: {
  readonly items: readonly TournamentListItemView[];
  readonly clubs: ReadonlyMap<string, ClubView> | undefined;
  readonly data?: string;
}): ReactNode {
  return (
    <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }} data-home-rail={data}>
      {items.map((tournament) => {
        const club = clubs?.get(tournament.clubId);

        return (
          <Box
            component="li"
            key={tournament.id}
            data-tournament={tournament.id}
            sx={{
              display: 'grid',
              gridTemplateColumns: 'auto minmax(0, 1fr)',
              alignItems: 'center',
              columnGap: 1,
              rowGap: 0.25,
              px: 2,
              py: 0.75,
              typography: 'body2',
              fontSize: 13,
              lineHeight: 1.3,
              borderTop: '1px solid var(--line)',
            }}
          >
            <StartTime startsAt={tournament.startsAt} />
            <Box sx={{ minWidth: 0 }}>
              <TournamentName tournament={tournament} truncate />
            </Box>
            <RatingCapBadge tournament={tournament} />
            <Box
              sx={{
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                color: 'text.secondary',
                fontSize: 12,
              }}
            >
              <Box
                component="span"
                sx={{
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {club === undefined ? '' : (club.shortName ?? club.name)}
              </Box>
              <Participants tournament={tournament} />
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
