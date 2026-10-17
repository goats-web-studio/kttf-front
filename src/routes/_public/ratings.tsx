import { DEFAULT_PAGE_SIZE, type ListPlayersQuery } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, type ReactNode } from 'react';
import { z } from 'zod';

import { fill, formatCount, useLocale, useT } from '@/common/i18n';
import { orUndefined, searchId, searchPage, searchText } from '@/common/search';
import EmptyState from '@/common/ui/empty-state';
import FilterSummary, { type ActiveFilter } from '@/common/ui/filter-summary';
import Pagination from '@/common/ui/pagination';
import QueryState from '@/common/ui/query-state';
import SearchInput from '@/common/ui/search-input';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { clubDirectoryQuery } from '@/features/clubs/queries';
import CityFilter from '@/features/places/city-filter';
import { useCityLabel } from '@/features/places/city-label';
import { usePlaceName } from '@/features/places/place-name';
import { playerName } from '@/features/players/player-name';
import { playersQuery } from '@/features/players/queries';

const searchSchema = z.object({
  search: searchText,
  /** Город справочника — по идентификатору (ADR-046). */
  city: searchId,
  club: searchId,
  page: searchPage,
});

type Search = z.infer<typeof searchSchema>;

export const Route = createFileRoute('/_public/ratings')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: RatingsPage,
});

/** Колонки, которых на телефоне нет: город уходит подписью под фамилию. */
const WIDE = { display: { xs: 'none', sm: 'table-cell' } } as const;

/**
 * Рейтинг по стране — ТЗ 9.1.
 *
 * Порядок задаёт сервер: рейтинг приходит строкой, и сортировка строк на
 * клиенте поставила бы «9.50» выше «100.00». Фильтры — те, что даёт контракт
 * ТС 7.2: поиск, город, клуб. Пола и возрастной категории в запросе нет,
 * расхождение с ТЗ записано открытым вопросом.
 *
 * История изменений рейтинга (ТЗ 9.1) живёт в профиле игрока, куда ведёт
 * фамилия в таблице: кривая одного игрока в списке на сотню строк не
 * помещается, а показывать её здесь всем сразу нечем.
 *
 * Фильтры и страница — в адресе (docs/07-design-system.md, 6.2 и 6.3):
 * игрок делится ссылкой на свою строку рейтинга города.
 */
function RatingsPage(): ReactNode {
  const t = useT();
  const locale = useLocale();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const page = search.page ?? 1;
  const players = useQuery(playersQuery(toQuery(search, page)));
  const clubs = useQuery(clubDirectoryQuery);
  const placeName = usePlaceName();
  const cityLabel = useCityLabel();

  // Смена фильтра возвращает на первую страницу; текст правится на месте,
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
  const commitSearch = useCallback(
    (value: string) => {
      filter({ search: orUndefined(value) }, true);
    },
    [filter],
  );

  const active: ActiveFilter[] = [];
  if (search.search !== undefined) {
    active.push({
      key: 'search',
      label: fill(t('filter.chipQuoted'), { value: search.search }),
      onRemove: () => {
        filter({ search: undefined });
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
  if (search.club !== undefined) {
    active.push({
      key: 'club',
      label: fill(t('filter.chip'), {
        label: t('filter.club'),
        value: clubs.data?.get(search.club)?.name ?? t('common.loading'),
      }),
      onRemove: () => {
        filter({ club: undefined });
      },
    });
  }

  const reset = (): void => {
    void navigate({ search: {} });
  };

  const pages =
    players.data === undefined
      ? 1
      : Math.max(1, Math.ceil(players.data.total / players.data.limit));

  return (
    <Container maxWidth="md" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <Typography variant="h1">{t('page.ratings.title')}</Typography>

      <Box
        role="search"
        sx={{
          mt: 3,
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr' },
        }}
      >
        <SearchInput
          label={t('ratings.search')}
          value={search.search}
          onCommit={commitSearch}
          autoComplete="off"
        />
        <CityFilter
          value={search.city}
          onChange={(city) => {
            filter({ city });
          }}
        />
        <TextField
          select
          label={t('filter.club')}
          value={search.club ?? ''}
          onChange={(event) => {
            filter({ club: orUndefined(event.target.value) });
          }}
        >
          <MenuItem value="">{t('filter.any')}</MenuItem>
          {[...(clubs.data?.values() ?? [])].map((club) => (
            <MenuItem key={club.id} value={club.id}>
              {club.name}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <FilterSummary
        total={players.isError ? null : players.data?.total}
        filters={active}
        onReset={reset}
      />

      <Box sx={{ mt: 2 }}>
        <QueryState
          isPending={players.isPending}
          error={players.error}
          onRetry={() => void players.refetch()}
          loading={<RowsSkeleton />}
        >
          {players.data === undefined ? null : players.data.items.length > 0 ? (
            // До 640px таблица сжимается до трёх колонок, а город уходит
            // подписью под фамилию (docs/08-ux-draft.md, 3.3): место и
            // рейтинг остаются крупными, горизонтальной прокрутки нет.
            // Шапка липкая (раздел 6.1).
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="right" sx={{ width: 48 }}>
                    {t('ratings.column.rank')}
                  </TableCell>
                  <TableCell>{t('ratings.column.player')}</TableCell>
                  <TableCell sx={WIDE}>{t('ratings.column.city')}</TableCell>
                  <TableCell align="right">{t('ratings.column.rating')}</TableCell>
                  <TableCell align="right" sx={WIDE}>
                    {t('ratings.column.matches')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {players.data.items.map((player, index) => (
                  <TableRow key={player.id} hover sx={{ height: { xs: 64, sm: 48 } }}>
                    <TableCell align="right" sx={{ color: 'text.secondary', ...NUM }}>
                      {formatCount((page - 1) * players.data.limit + index + 1, locale)}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/players/${player.id}`}
                        color="text.primary"
                        sx={{ fontWeight: 500, display: 'inline-block', py: 1 }}
                      >
                        {playerName(player)}
                      </Link>
                      {player.isProvisional && (
                        // Провизорный рейтинг двигается быстрее и означает, что
                        // игрок сыграл меньше 20 рейтинговых встреч (ТЗ 7.1).
                        // Подписью, а не плашкой в рамке: в новом рейтинге
                        // провизорны почти все, и рамки в каждой строке
                        // рябили сильнее самих фамилий.
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                          sx={{ ml: 1, whiteSpace: 'nowrap' }}
                        >
                          {t('ratings.provisional')}
                        </Typography>
                      )}
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ display: { sm: 'none' }, mt: -0.5 }}
                      >
                        {placeName(player.city)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ ...WIDE, color: 'text.secondary' }}>
                      {placeName(player.city)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        ...NUM,
                        fontWeight: 600,
                        fontSize: { xs: 17, sm: 15 },
                      }}
                    >
                      {player.rating}
                    </TableCell>
                    <TableCell align="right" sx={{ ...WIDE, ...NUM, color: 'text.secondary' }}>
                      {formatCount(player.ratedMatches, locale)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : active.length > 0 ? (
            <EmptyState
              title={t('ratings.notFound.title')}
              text={t('ratings.notFound.text')}
              action={<Button onClick={reset}>{t('filter.resetAll')}</Button>}
            />
          ) : (
            <EmptyState
              title={t('ratings.emptyState.title')}
              text={t('ratings.emptyState.text')}
              action={<Button href="/tournaments">{t('ratings.emptyState.action')}</Button>}
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

/** Числа — одной ширины цифр, чтобы разряды стояли столбиком (раздел 6.1). */
const NUM = { fontVariantNumeric: 'tabular-nums' } as const;

function toQuery(search: Search, page: number): ListPlayersQuery {
  return {
    page,
    limit: DEFAULT_PAGE_SIZE,
    ...(search.search === undefined ? {} : { search: search.search }),
    ...(search.city === undefined ? {} : { cityId: search.city }),
    ...(search.club === undefined ? {} : { clubId: search.club }),
  };
}
