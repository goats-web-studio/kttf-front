import {
  DEFAULT_PAGE_SIZE,
  tournamentStatusSchema,
  type ListTournamentsQuery,
  type TournamentStatus,
} from '@kttf/shared/types';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useCallback, type ReactNode } from 'react';
import { z } from 'zod';

import { formatDate, useLocale, useT } from '@/common/i18n';
import { orUndefined, searchDay, searchId, searchPage, searchText } from '@/common/search';
import Button from '@/common/ui/button';
import EmptyState from '@/common/ui/empty-state';
import { Field, Input, Select } from '@/common/ui/field';
import FilterSummary, { type ActiveFilter } from '@/common/ui/filter-summary';
import Pagination from '@/common/ui/pagination';
import QueryState from '@/common/ui/query-state';
import SearchInput from '@/common/ui/search-input';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { useSessionStore } from '@/features/auth/session-store';
import { clubDirectoryQuery } from '@/features/clubs/queries';
import { managedClubIds } from '@/features/clubs/roles';
import { TOURNAMENT_STATUS_KEYS } from '@/features/tournaments/labels';
import { tournamentsQuery } from '@/features/tournaments/queries';
import TournamentCard from '@/features/tournaments/tournament-card';

/**
 * Статусы, которыми фильтруют публичный календарь.
 *
 * Черновика здесь нет: организатор видит свои черновики в списке и так, а
 * остальным этот фильтр вернул бы пустую страницу и вопрос, куда делись
 * турниры.
 */
const FILTERABLE: readonly TournamentStatus[] = [
  'PUBLISHED',
  'REG_OPEN',
  'REG_CLOSED',
  'RUNNING',
  'FINISHED',
  'RATED',
  'CANCELLED',
];

const searchSchema = z.object({
  city: searchText,
  club: searchId,
  status: tournamentStatusSchema
    .refine((status) => FILTERABLE.includes(status))
    .optional()
    .catch(undefined),
  from: searchDay,
  to: searchDay,
  page: searchPage,
});

type Search = z.infer<typeof searchSchema>;

export const Route = createFileRoute('/_public/tournaments/')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: TournamentsPage,
});

/**
 * Календарь турниров — ТЗ 9.2.
 *
 * Фильтры ТЗ реализованы теми, что даёт контракт ТС 7.5: город, клуб, даты,
 * состояние. Планки рейтинга и возраста в запросе списка нет — расхождение
 * записано открытым вопросом, самовольно контракт не расширяем (бриф 4.2).
 *
 * Фильтры живут в адресе и применяются сразу, без кнопки «Показать»
 * (docs/07-design-system.md, 6.2): ссылку на турниры города пересылают в
 * чат клуба, и она открывается тем же списком.
 */
function TournamentsPage(): ReactNode {
  const t = useT();
  const locale = useLocale();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const page = search.page ?? 1;
  const tournaments = useQuery(tournamentsQuery(toQuery(search, page)));
  const clubs = useQuery(clubDirectoryQuery);

  // Создание турнира стоит там, где организатор смотрит турниры, а не в
  // отдельном разделе кабинета: разделов ТЗ кабинету не отводит.
  const user = useSessionStore((state) => state.user);
  const canCreate = managedClubIds(user).length > 0;

  // Любая смена фильтра возвращает на первую страницу: третьей страницы
  // суженного списка может не быть. Текст правится на месте (`replace`),
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
  const commitCity = useCallback(
    (value: string) => {
      filter({ city: orUndefined(value) }, true);
    },
    [filter],
  );

  const active: ActiveFilter[] = [];
  if (search.city !== undefined) {
    active.push({
      key: 'city',
      label: `${t('filter.city')}: ${search.city}`,
      onRemove: () => {
        filter({ city: undefined });
      },
    });
  }
  if (search.club !== undefined) {
    active.push({
      key: 'club',
      label: `${t('filter.club')}: ${clubs.data?.get(search.club)?.name ?? '…'}`,
      onRemove: () => {
        filter({ club: undefined });
      },
    });
  }
  if (search.status !== undefined) {
    active.push({
      key: 'status',
      label: t(TOURNAMENT_STATUS_KEYS[search.status]),
      onRemove: () => {
        filter({ status: undefined });
      },
    });
  }
  if (search.from !== undefined) {
    active.push({
      key: 'from',
      label: `${t('filter.from')}: ${formatDate(search.from, locale)}`,
      onRemove: () => {
        filter({ from: undefined });
      },
    });
  }
  if (search.to !== undefined) {
    active.push({
      key: 'to',
      label: `${t('filter.to')}: ${formatDate(search.to, locale)}`,
      onRemove: () => {
        filter({ to: undefined });
      },
    });
  }

  const reset = (): void => {
    void navigate({ search: {} });
  };

  const pages =
    tournaments.data === undefined
      ? 1
      : Math.max(1, Math.ceil(tournaments.data.total / tournaments.data.limit));

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-display-md font-bold text-ink-900">
          {t('page.tournaments.title')}
        </h1>
        {/* Ссылка, ведущая себя как кнопка: asChild отдаёт стиль варианта
            якорю, и переход остаётся переходом — с middle-click и «открыть в
            новой вкладке», которых у button нет. */}
        {canCreate && (
          <Button asChild variant="primary">
            <Link to="/tournaments/new">{t('tournament.form.create')}</Link>
          </Button>
        )}
      </div>

      <div
        role="search"
        className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_2fr_2fr_1.5fr_1.5fr]"
      >
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

        <Field label={t('filter.status')}>
          <Select
            value={search.status ?? ''}
            onChange={(event) => {
              const value = event.target.value;
              filter({ status: FILTERABLE.find((status) => status === value) });
            }}
          >
            <option value="">{t('filter.any')}</option>
            {FILTERABLE.map((status) => (
              <option key={status} value={status}>
                {t(TOURNAMENT_STATUS_KEYS[status])}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t('filter.from')}>
          <Input
            type="date"
            value={search.from ?? ''}
            max={search.to}
            onChange={(event) => {
              filter({ from: orUndefined(event.target.value) });
            }}
          />
        </Field>

        <Field label={t('filter.to')}>
          <Input
            type="date"
            value={search.to ?? ''}
            min={search.from}
            onChange={(event) => {
              filter({ to: orUndefined(event.target.value) });
            }}
          />
        </Field>
      </div>

      <FilterSummary total={tournaments.data?.total} filters={active} onReset={reset} />

      <div className="mt-4">
        <QueryState
          isPending={tournaments.isPending}
          error={tournaments.error}
          onRetry={() => void tournaments.refetch()}
          loading={<RowsSkeleton />}
        >
          {tournaments.data === undefined ? null : tournaments.data.items.length > 0 ? (
            <ul className="divide-y divide-line border-y border-line">
              {tournaments.data.items.map((tournament) => (
                <li key={tournament.id}>
                  <TournamentCard
                    tournament={tournament}
                    club={clubs.data?.get(tournament.clubId)}
                  />
                </li>
              ))}
            </ul>
          ) : active.length > 0 ? (
            <EmptyState
              title={t('tournaments.notFound.title')}
              text={t('tournaments.notFound.text')}
              action={<Button onClick={reset}>{t('filter.resetAll')}</Button>}
            />
          ) : (
            <EmptyState
              title={t('tournaments.emptyState.title')}
              text={t('tournaments.emptyState.text')}
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
 * Фильтры адреса — в запрос ТС 7.5.
 *
 * Границы дат раздвигаются до краёв суток: человек выбирает день, а контракт
 * принимает момент времени. Без этого турнир, начинающийся в полдень, не
 * попал бы в выборку «по сегодня».
 */
function toQuery(search: Search, page: number): ListTournamentsQuery {
  return {
    page,
    limit: DEFAULT_PAGE_SIZE,
    ...(search.city === undefined ? {} : { city: search.city }),
    ...(search.club === undefined ? {} : { clubId: search.club }),
    ...(search.status === undefined ? {} : { status: search.status }),
    ...(search.from === undefined ? {} : { from: `${search.from}T00:00:00.000Z` }),
    ...(search.to === undefined ? {} : { to: `${search.to}T23:59:59.999Z` }),
  };
}
