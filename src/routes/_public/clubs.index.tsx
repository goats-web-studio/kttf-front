import { DEFAULT_PAGE_SIZE, type ListClubsQuery } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, type ReactNode } from 'react';
import { z } from 'zod';

import { fill, useT } from '@/common/i18n';
import { orUndefined, searchId, searchPage, searchText } from '@/common/search';
import EmptyState from '@/common/ui/empty-state';
import FilterSummary, { type ActiveFilter } from '@/common/ui/filter-summary';
import Pagination from '@/common/ui/pagination';
import QueryState from '@/common/ui/query-state';
import SearchInput from '@/common/ui/search-input';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { useSessionStore } from '@/features/auth/session-store';
import ClubCard from '@/features/clubs/club-card';
import { clubsQuery } from '@/features/clubs/queries';
import CityFilter from '@/features/places/city-filter';
import { useCityLabel } from '@/features/places/city-label';

const searchSchema = z.object({
  /** Город справочника — по идентификатору (ADR-046). */
  city: searchId,
  q: searchText,
  page: searchPage,
});

type Search = z.infer<typeof searchSchema>;

export const Route = createFileRoute('/_public/clubs/')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: ClubsPage,
});

/**
 * Клубы — ТЗ 3.2, раздел публичной части.
 *
 * Фильтры — те, что даёт контракт ТС 7.4: город и поиск по названию. Живут в
 * адресе, как в календаре (docs/07-design-system.md, 6.2): ссылку на клубы
 * города пересылают в чат.
 */
function ClubsPage(): ReactNode {
  const t = useT();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const user = useSessionStore((state) => state.user);

  const page = search.page ?? 1;
  const clubs = useQuery(clubsQuery(toQuery(search, page)));

  // Как в календаре: смена фильтра возвращает на первую страницу, а текст
  // правится на месте, чтобы «Назад» не проходил по буквам.
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
  if (search.city !== undefined) {
    active.push({
      key: 'city',
      label: fill(t('filter.chip'), { label: t('filter.city'), value: cityLabel(search.city) }),
      onRemove: () => {
        filter({ city: undefined });
      },
    });
  }

  const reset = (): void => {
    void navigate({ search: {} });
  };

  const pages =
    clubs.data === undefined ? 1 : Math.max(1, Math.ceil(clubs.data.total / clubs.data.limit));

  return (
    <Container maxWidth="md" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <Stack
        direction="row"
        useFlexGap
        spacing={2}
        sx={{ flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between' }}
      >
        <Typography variant="h1">{t('page.clubs.title')}</Typography>
        {/* Клуб заводит любой вошедший — ОВ-13. Гостю кнопка ведёт ко входу
            через охрану кабинета и возвращает сюда же. */}
        {user !== null && <Button href="/cabinet/clubs/new">{t('club.create')}</Button>}
      </Stack>

      <Box
        role="search"
        sx={{ mt: 3, display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}
      >
        <SearchInput label={t('clubs.filter.name')} value={search.q} onCommit={commitQ} />
        {/* Город выбирается из справочника, а не набирается: сервер
            фильтрует по записи, а не по строке (ADR-046). */}
        <CityFilter
          value={search.city}
          onChange={(city) => {
            filter({ city });
          }}
        />
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
              {clubs.data.items.map((club) => (
                <Box component="li" key={club.id} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <ClubCard club={club} />
                </Box>
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
              action={<Button href="/cabinet/clubs/new">{t('club.create')}</Button>}
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

function toQuery(search: Search, page: number): ListClubsQuery {
  return {
    page,
    limit: DEFAULT_PAGE_SIZE,
    ...(search.city === undefined ? {} : { cityId: search.city }),
    ...(search.q === undefined ? {} : { search: search.q }),
  };
}
