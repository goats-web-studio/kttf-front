import {
  CLUB_AMENITIES,
  DEFAULT_PAGE_SIZE,
  type ClubAmenity,
  type ListClubsRequest,
} from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { SlidersHorizontal } from 'lucide-react';
import { Fragment, useCallback, useId, useState, type ReactNode } from 'react';
import { z } from 'zod';

import { fill, useT } from '@/common/i18n';
import { orUndefined, searchPage, searchText } from '@/common/search';
import AdSlot from '@/common/ui/ad-slot';
import EmptyState from '@/common/ui/empty-state';
import FilterSummary, { type ActiveFilter } from '@/common/ui/filter-summary';
import Pagination from '@/common/ui/pagination';
import QueryState from '@/common/ui/query-state';
import SearchInput from '@/common/ui/search-input';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { useSessionStore } from '@/features/auth/session-store';
import { AMENITY_ICONS, amenityLabel } from '@/features/clubs/amenity-meta';
import ClubCard from '@/features/clubs/club-card';
import { clubsQuery } from '@/features/clubs/queries';
import CitiesFilter from '@/features/places/cities-filter';
import { useCityLabel } from '@/features/places/city-label';

/**
 * Список через запятую в адресе — как города в «Игроках» (ADR-054): ссылку
 * на клубы двух городов с детской секцией пересылают в чат. Кривой элемент
 * выпадает один, остальные остаются.
 */
function commaList(valid: (part: string) => boolean) {
  return z
    .preprocess(
      (value) =>
        typeof value === 'string'
          ? value
              .split(',')
              .map((part) => part.trim())
              .filter(valid)
              .join(',')
          : value,
      z.string().min(1),
    )
    .optional()
    .catch(undefined);
}

const isAmenity = (part: string): part is ClubAmenity =>
  CLUB_AMENITIES.some((amenity) => amenity === part);

const searchSchema = z.object({
  /** Города справочника — по идентификаторам (ADR-046), через запятую. */
  city: commaList((part) => z.uuid().safeParse(part).success),
  /** Удобства — все сразу, а не любое из них. */
  amenities: commaList(isAmenity),
  /** Только клубы с ближайшим турниром. */
  upcoming: z.literal(true).optional().catch(undefined),
  q: searchText,
  page: searchPage,
});

type Search = z.infer<typeof searchSchema>;

export const Route = createFileRoute('/_public/clubs/')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: ClubsPage,
});

/** После какой карточки стоит рекламный слот (`docs/09` 5.5). */
const AD_AFTER = 6;

const listOf = (value: string | undefined): string[] =>
  value === undefined ? [] : value.split(',');

const amenitiesOf = (search: Search): ClubAmenity[] => listOf(search.amenities).filter(isAmenity);

/**
 * Клубы — `docs/09` 5.1, ADR-055.
 *
 * Фильтры: название, города, удобства, «скоро турнир». Применяются сразу —
 * у клубов их мало, и ждать кнопки ради чипа незачем. Живут в адресе, как в
 * календаре (07, 6.2). Порядок задаёт сервер: ближайший турнир, затем
 * свежесть страницы.
 */
function ClubsPage(): ReactNode {
  const t = useT();
  const id = useId();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const user = useSessionStore((state) => state.user);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const page = search.page ?? 1;
  const clubs = useQuery(clubsQuery(toQuery(search, page)));
  const cities = listOf(search.city);
  const amenities = amenitiesOf(search);

  // Смена фильтра возвращает на первую страницу, а текст правится на месте,
  // чтобы «Назад» не проходил по буквам.
  const filter = useCallback(
    (patch: Partial<Search>, replace = false) => {
      void navigate({
        search: (previous) => ({ ...previous, ...patch, page: undefined }),
        replace,
      });
    },
    [navigate],
  );
  const commitQ = useCallback(
    (value: string) => {
      filter({ q: orUndefined(value) }, true);
    },
    [filter],
  );
  const cityLabel = useCityLabel();
  // Клуб заводится только из заявки «Напишите нам» (ADR-049).
  const newClub =
    user?.isAdmin === true ? null : <Button href="/feedback">{t('clubs.apply')}</Button>;

  const toggleAmenity = (amenity: ClubAmenity): void => {
    const next = amenities.includes(amenity)
      ? amenities.filter((item) => item !== amenity)
      : [...amenities, amenity];

    filter({ amenities: next.length === 0 ? undefined : next.join(',') });
  };

  const active: ActiveFilter[] = [];
  if (search.q !== undefined) {
    active.push({
      key: 'q',
      label: fill(t('filter.chip'), { label: t('clubs.filter.name'), value: search.q }),
      onRemove: () => {
        filter({ q: undefined });
      },
    });
  }
  for (const city of cities) {
    active.push({
      key: `city-${city}`,
      label: fill(t('filter.chip'), { label: t('filter.city'), value: cityLabel(city) }),
      onRemove: () => {
        const rest = cities.filter((item) => item !== city);
        filter({ city: rest.length === 0 ? undefined : rest.join(',') });
      },
    });
  }
  for (const amenity of amenities) {
    active.push({
      key: `amenity-${amenity}`,
      label: t(amenityLabel(amenity)),
      onRemove: () => {
        toggleAmenity(amenity);
      },
    });
  }
  if (search.upcoming === true) {
    active.push({
      key: 'upcoming',
      label: t('clubs.filter.upcoming'),
      onRemove: () => {
        filter({ upcoming: undefined });
      },
    });
  }

  const reset = (): void => {
    void navigate({ search: {} });
  };

  const pages =
    clubs.data === undefined ? 1 : Math.max(1, Math.ceil(clubs.data.total / clubs.data.limit));
  const extraCount = cities.length + amenities.length + (search.upcoming === true ? 1 : 0);

  const chips = (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      <Chip
        label={t('clubs.filter.upcoming')}
        clickable
        variant={search.upcoming === true ? 'filled' : 'outlined'}
        aria-pressed={search.upcoming === true}
        onClick={() => {
          filter({ upcoming: search.upcoming === true ? undefined : true });
        }}
        sx={{ height: 40 }}
      />
      {CLUB_AMENITIES.map((amenity) => {
        const Icon = AMENITY_ICONS[amenity];
        const selected = amenities.includes(amenity);

        return (
          <Chip
            key={amenity}
            icon={<Icon size={16} aria-hidden />}
            label={t(amenityLabel(amenity))}
            clickable
            variant={selected ? 'filled' : 'outlined'}
            aria-pressed={selected}
            onClick={() => {
              toggleAmenity(amenity);
            }}
            sx={{ height: 40 }}
          />
        );
      })}
    </Box>
  );

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <Stack
        direction="row"
        useFlexGap
        spacing={2}
        sx={{ flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between' }}
      >
        <Typography variant="h1">{t('page.clubs.title')}</Typography>
        {newClub}
      </Stack>

      <Box role="search" sx={{ mt: 3, display: 'grid', gap: 1.5 }}>
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <SearchInput label={t('clubs.filter.name')} value={search.q} onCommit={commitQ} />
          <Box sx={{ display: { xs: filtersOpen ? 'block' : 'none', sm: 'block' } }}>
            <CitiesFilter
              label={t('clubs.filter.cities')}
              value={cities}
              onChange={(next) => {
                filter({ city: next.length === 0 ? undefined : next.join(',') });
              }}
            />
          </Box>
        </Box>
        {/* Телефон: город и удобства раскрываются кнопкой, иначе фильтры
            занимают весь первый экран и клубов не видно. */}
        <Button
          variant="outlined"
          startIcon={<SlidersHorizontal size={16} aria-hidden />}
          aria-expanded={filtersOpen}
          aria-controls={`${id}-filters`}
          onClick={() => {
            setFiltersOpen((open) => !open);
          }}
          sx={{ display: { xs: 'inline-flex', sm: 'none' }, minHeight: 44, justifySelf: 'start' }}
        >
          {extraCount === 0
            ? t('clubs.filter.open')
            : fill(t('clubs.filter.openCount'), { count: String(extraCount) })}
        </Button>
        <Box
          id={`${id}-filters`}
          sx={{ display: { xs: filtersOpen ? 'block' : 'none', sm: 'block' } }}
        >
          {chips}
        </Box>
      </Box>

      <FilterSummary
        total={clubs.isError ? null : clubs.data?.total}
        filters={active}
        onReset={reset}
      />

      <Box sx={{ mt: 2 }}>
        <QueryState
          isPending={clubs.isPending}
          error={clubs.error}
          onRetry={() => void clubs.refetch()}
          loading={<RowsSkeleton />}
        >
          {clubs.data === undefined ? null : clubs.data.items.length > 0 ? (
            <Box
              component="ul"
              sx={{ listStyle: 'none', m: 0, p: 0, borderTop: 1, borderColor: 'divider' }}
            >
              {clubs.data.items.map((club, index) => (
                <Fragment key={club.id}>
                  <Box component="li" sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <ClubCard club={club} />
                  </Box>
                  {index === AD_AFTER - 1 && <AdSlot placement="list-inline" />}
                </Fragment>
              ))}
            </Box>
          ) : active.length > 0 ? (
            <EmptyState
              title={t('clubs.notFound.title')}
              text={t('clubs.notFound.text')}
              action={<Button onClick={reset}>{t('filter.resetAll')}</Button>}
            />
          ) : (
            <EmptyState
              title={t('clubs.emptyState.title')}
              text={t('clubs.emptyState.text')}
              action={newClub}
            />
          )}
        </QueryState>
      </Box>

      <Pagination
        page={page}
        pages={pages}
        onPage={(next) => {
          void navigate({
            search: (previous) => ({ ...previous, page: next === 1 ? undefined : next }),
          });
        }}
      />
    </Container>
  );
}

function toQuery(search: Search, page: number): ListClubsRequest {
  const amenities = amenitiesOf(search);

  return {
    page,
    limit: DEFAULT_PAGE_SIZE,
    ...(search.city === undefined ? {} : { cityId: listOf(search.city) }),
    ...(search.q === undefined ? {} : { search: search.q }),
    ...(amenities.length === 0 ? {} : { amenities }),
    ...(search.upcoming === true ? { upcoming: true } : {}),
  };
}
