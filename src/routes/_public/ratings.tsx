import { DEFAULT_PAGE_SIZE, type ListPlayersQuery } from '@kttf/shared/types';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useCallback, type ReactNode } from 'react';
import { z } from 'zod';

import { fill, formatCount, useLocale, useT } from '@/common/i18n';
import { orUndefined, searchId, searchPage, searchText } from '@/common/search';
import Button from '@/common/ui/button';
import { cn } from '@/common/ui/cn';
import EmptyState from '@/common/ui/empty-state';
import { Field, Select } from '@/common/ui/field';
import FilterSummary, { type ActiveFilter } from '@/common/ui/filter-summary';
import Pagination from '@/common/ui/pagination';
import QueryState from '@/common/ui/query-state';
import SearchInput from '@/common/ui/search-input';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { clubDirectoryQuery } from '@/features/clubs/queries';
import { playerName } from '@/features/players/player-name';
import { playersQuery } from '@/features/players/queries';

const searchSchema = z.object({
  search: searchText,
  city: searchText,
  club: searchId,
  page: searchPage,
});

type Search = z.infer<typeof searchSchema>;

export const Route = createFileRoute('/_public/ratings')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: RatingsPage,
});

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
  const commitCity = useCallback(
    (value: string) => {
      filter({ city: orUndefined(value) }, true);
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
      label: fill(t('filter.chip'), { label: t('filter.city'), value: search.city }),
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
    <section className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
      <h1 className="font-display text-display-md font-bold text-ink-900">
        {t('page.ratings.title')}
      </h1>

      <div role="search" className="mt-6 grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <Field label={t('ratings.search')}>
          <SearchInput value={search.search} onCommit={commitSearch} autoComplete="off" />
        </Field>

        <Field label={t('filter.city')}>
          <SearchInput value={search.city} onCommit={commitCity} autoComplete="address-level2" />
        </Field>

        <Field label={t('filter.club')}>
          <Select
            value={search.club ?? ''}
            onChange={(event) => {
              filter({ club: orUndefined(event.target.value) });
            }}
          >
            <option value="">{t('filter.any')}</option>
            {[...(clubs.data?.values() ?? [])].map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <FilterSummary
        total={players.isError ? null : players.data?.total}
        filters={active}
        onReset={reset}
      />

      <div className="mt-4">
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
            <table className="w-full border-separate border-spacing-0 text-base">
              <thead>
                <tr className="text-left text-sm text-ink-500">
                  <Th className="w-12 text-right">{t('ratings.column.rank')}</Th>
                  <Th>{t('ratings.column.player')}</Th>
                  <Th className="hidden sm:table-cell">{t('ratings.column.city')}</Th>
                  <Th className="text-right">{t('ratings.column.rating')}</Th>
                  <Th className="hidden text-right sm:table-cell">{t('ratings.column.matches')}</Th>
                </tr>
              </thead>
              <tbody>
                {players.data.items.map((player, index) => (
                  <tr key={player.id} className="h-14 sm:h-11 [&>td]:border-b [&>td]:border-line">
                    <td className="pr-4 text-right tabular-nums text-ink-500">
                      {formatCount((page - 1) * players.data.limit + index + 1, locale)}
                    </td>
                    <td className="pr-4">
                      <Link
                        to="/players/$playerId"
                        params={{ playerId: player.id }}
                        className="inline-block py-2.5 font-medium text-ink-900 hover:text-red-600 hover:underline"
                      >
                        {playerName(player)}
                      </Link>
                      {player.isProvisional && (
                        // Провизорный рейтинг двигается быстрее и означает, что
                        // игрок сыграл меньше 20 рейтинговых встреч (ТЗ 7.1).
                        <span className="ml-2 whitespace-nowrap rounded-xs border border-line px-1.5 text-2xs text-ink-500">
                          {t('ratings.provisional')}
                        </span>
                      )}
                      <span className="-mt-2 block pb-2 text-sm text-ink-500 sm:hidden">
                        {player.city}
                      </span>
                    </td>
                    <td className="hidden pr-4 text-ink-700 sm:table-cell">{player.city}</td>
                    <td className="pr-4 text-right font-display text-lg font-semibold tabular-nums text-ink-900 sm:font-ui sm:text-base sm:font-medium">
                      {player.rating}
                    </td>
                    <td className="hidden pr-2 text-right tabular-nums text-ink-700 sm:table-cell">
                      {formatCount(player.ratedMatches, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              action={
                <Button asChild>
                  <Link to="/tournaments">{t('ratings.emptyState.action')}</Link>
                </Button>
              }
            />
          )}
        </QueryState>
      </div>

      <Pagination
        page={page}
        pages={pages}
        onPage={(next) => {
          void navigate({
            search: (previous) => ({ ...previous, page: next === 1 ? undefined : next }),
          });
        }}
      />
    </section>
  );
}

/**
 * Ячейка шапки. Шапка липкая (docs/07-design-system.md, 6.1): на сотой
 * строке рейтинга видно, какая колонка — рейтинг, а какая — число встреч.
 */
function Th({
  className,
  children,
}: {
  readonly className?: string;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <th
      scope="col"
      className={cn(
        'sticky top-0 z-(--z-sticky) border-b border-line bg-paper py-2 pr-4 font-normal',
        className,
      )}
    >
      {children}
    </th>
  );
}

function toQuery(search: Search, page: number): ListPlayersQuery {
  return {
    page,
    limit: DEFAULT_PAGE_SIZE,
    ...(search.search === undefined ? {} : { search: search.search }),
    ...(search.city === undefined ? {} : { city: search.city }),
    ...(search.club === undefined ? {} : { clubId: search.club }),
  };
}
