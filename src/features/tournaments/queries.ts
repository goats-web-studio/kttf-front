import {
  MAX_PAGE_SIZE,
  type ListTournamentsRequest,
  type TournamentListItemView,
} from '@kttf/shared/types';
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { fetchTournament, fetchTournamentResults, listRegistrations, listTournaments } from './api';

/** Ключи кэша турниров. Фильтры входят в ключ списка целиком. */
export const tournamentKeys = {
  all: ['tournaments'] as const,
  list: (query: ListTournamentsRequest) => ['tournaments', 'list', query] as const,
  month: (filters: TournamentFilters, from: string, to: string) =>
    ['tournaments', 'month', filters, from, to] as const,
  feed: (filters: TournamentFilters, side: FeedSide, bound: string) =>
    ['tournaments', 'feed', side, filters, bound] as const,
  detail: (id: string) => ['tournaments', 'detail', id] as const,
  results: (id: string) => ['tournaments', 'results', id] as const,
  registrations: (id: string) => ['tournaments', 'registrations', id] as const,
};

/**
 * Состав участников — ТЗ 4.3.
 *
 * Отдельным запросом от результатов: в результатах участник приходит без
 * идентификатора записи, а снять её или поправить без него нечем.
 */
export function registrationsQuery(id: string) {
  return queryOptions({
    queryKey: tournamentKeys.registrations(id),
    queryFn: () => listRegistrations(id),
  });
}

export function tournamentsQuery(query: ListTournamentsRequest) {
  return queryOptions({
    queryKey: tournamentKeys.list(query),
    queryFn: () => listTournaments(query),
  });
}

/** Фильтры страницы «Турниры», общие для календаря и списка (ADR-052). */
export type TournamentFilters = Omit<
  ListTournamentsRequest,
  'page' | 'limit' | 'order' | 'from' | 'to'
>;

/** Месяцев с сотней турниров в городе не бывает; потолок — защита от зацикливания. */
const MONTH_PAGES = 10;

/**
 * Месяц календаря целиком. Страницами по сотне: календарю нужны все турниры
 * месяца сразу, а потолок страницы контракт держит (ТС 7).
 */
export function monthTournamentsQuery(filters: TournamentFilters, from: Date, to: Date) {
  const range = { from: from.toISOString(), to: to.toISOString() };

  return queryOptions({
    queryKey: tournamentKeys.month(filters, range.from, range.to),
    queryFn: async (): Promise<readonly TournamentListItemView[]> => {
      const items: TournamentListItemView[] = [];

      for (let page = 1; page <= MONTH_PAGES; page += 1) {
        const next = await listTournaments({ ...filters, ...range, page, limit: MAX_PAGE_SIZE });
        items.push(...next.items);

        if (page * next.limit >= next.total) break;
      }

      return items;
    },
  });
}

/** Блок списка: «Ближайшие» от ранних, «Прошедшие» от свежих. */
export type FeedSide = 'upcoming' | 'past';

/** Турниров на подгрузку в блоке списка. */
export const FEED_PAGE = 30;

/**
 * Блок списка — подгрузкой «Показать ещё» (07, 6.3). Граница — начало
 * сегодняшнего дня: сегодняшние турниры, и сыгранные тоже, — в «Ближайших».
 * Даты фильтра сужают блок, но границу не переходят.
 */
export function tournamentsFeedQuery(
  filters: TournamentFilters,
  side: FeedSide,
  today: Date,
  range: { readonly from?: Date; readonly to?: Date },
) {
  const upcoming = side === 'upcoming';
  const bound = upcoming
    ? { from: later(today, range.from), ...(range.to === undefined ? {} : { to: range.to }) }
    : {
        to: earlier(new Date(today.getTime() - 1), range.to),
        ...(range.from === undefined ? {} : { from: range.from }),
      };
  const query = {
    ...filters,
    ...(bound.from === undefined ? {} : { from: bound.from.toISOString() }),
    ...(bound.to === undefined ? {} : { to: bound.to.toISOString() }),
    order: upcoming ? ('asc' as const) : ('desc' as const),
    limit: FEED_PAGE,
  };

  return infiniteQueryOptions({
    queryKey: tournamentKeys.feed(filters, side, JSON.stringify(bound)),
    queryFn: ({ pageParam }) => listTournaments({ ...query, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.limit < last.total ? last.page + 1 : undefined),
  });
}

function later(left: Date, right: Date | undefined): Date {
  return right === undefined || left > right ? left : right;
}

function earlier(left: Date, right: Date | undefined): Date {
  return right === undefined || left < right ? left : right;
}

export function tournamentQuery(id: string) {
  return queryOptions({
    queryKey: tournamentKeys.detail(id),
    queryFn: () => fetchTournament(id),
  });
}

/**
 * Результаты идущего турнира устаревают быстро.
 *
 * Страница результатов открыта у зрителей в зале, пока идут встречи, и
 * получасовой кэш показал бы им счёт получасовой давности. Обновление по
 * возвращении в вкладку здесь уместно, в отличие от умолчания клиента.
 */
export function tournamentResultsQuery(id: string) {
  return queryOptions({
    queryKey: tournamentKeys.results(id),
    queryFn: () => fetchTournamentResults(id),
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });
}
