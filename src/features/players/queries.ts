import type { ListPlayersQuery, PlayerMatchesQuery, PlayerStatsPeriod } from '@kttf/shared/types';
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import {
  fetchHeadToHead,
  fetchPlayer,
  fetchPlayerBestWins,
  fetchPlayerMatches,
  fetchPlayerSummary,
  fetchPlayerTournaments,
  fetchRatingHistory,
  listPlayers,
} from './api';

/**
 * Ключи кэша игроков.
 *
 * Фильтры входят в ключ целиком: без них смена города показала бы список
 * предыдущего, пока не придёт ответ.
 */
export const playerKeys = {
  all: ['players'] as const,
  list: (query: ListPlayersQuery) => ['players', 'list', query] as const,
  detail: (id: string) => ['players', 'detail', id] as const,
  ratingHistory: (id: string) => ['players', 'rating-history', id] as const,
  matches: (id: string, query: PlayerMatchesQuery) => ['players', 'matches', id, query] as const,
  headToHead: (id: string, opponentId: string) =>
    ['players', 'head-to-head', id, opponentId] as const,
  summary: (id: string, period: PlayerStatsPeriod) => ['players', 'summary', id, period] as const,
  bestWins: (id: string, period: PlayerStatsPeriod) =>
    ['players', 'best-wins', id, period] as const,
  tournaments: (id: string) => ['players', 'tournaments', id] as const,
};

export function playersQuery(query: ListPlayersQuery) {
  return queryOptions({
    queryKey: playerKeys.list(query),
    queryFn: () => listPlayers(query),
  });
}

export function playerQuery(id: string) {
  return queryOptions({
    queryKey: playerKeys.detail(id),
    queryFn: () => fetchPlayer(id),
  });
}

/**
 * Кривая рейтинга — ТЗ 9.3.
 *
 * Границы по времени контракт допускает, но экран их не задаёт: у игрока за
 * год набирается десяток турниров, и резать эту историю нечего. Параметр
 * остаётся в `api.ts` вместе с контрактом, а не выдумывается заново, когда
 * период понадобится.
 */
export function playerRatingHistoryQuery(id: string) {
  return queryOptions({
    queryKey: playerKeys.ratingHistory(id),
    queryFn: () => fetchRatingHistory(id),
  });
}

export function playerMatchesQuery(id: string, query: PlayerMatchesQuery) {
  return queryOptions({
    queryKey: playerKeys.matches(id, query),
    queryFn: () => fetchPlayerMatches(id, query),
  });
}

/**
 * Личный счёт против соперника — ТЗ 9.3.
 *
 * Запрашивается только когда соперник выбран: страница не знает заранее, чей
 * счёт человеку интересен, а тянуть его на каждого встреченного соперника
 * означало бы столько запросов, сколько строк в истории.
 */
export function headToHeadQuery(id: string, opponentId: string) {
  return queryOptions({
    queryKey: playerKeys.headToHead(id, opponentId),
    queryFn: () => fetchHeadToHead(id, opponentId),
  });
}

/** Общая статистика за период — ADR-048. */
export function playerSummaryQuery(id: string, period: PlayerStatsPeriod) {
  return queryOptions({
    queryKey: playerKeys.summary(id, period),
    queryFn: () => fetchPlayerSummary(id, period),
  });
}

/** Лучшие победы за период — ADR-050. */
export function playerBestWinsQuery(id: string, period: PlayerStatsPeriod) {
  return queryOptions({
    queryKey: playerKeys.bestWins(id, period),
    queryFn: () => fetchPlayerBestWins(id, period),
  });
}

/** Турниров на подгрузку: «Показать ещё» добавляет столько же. */
export const TOURNAMENTS_PAGE = 5;

/**
 * «Результаты» — подгрузкой, а не страницами: история турниров читается
 * сверху вниз, и вернуться к своему месту в ней не нужно (07, 6.3).
 */
export function playerTournamentsQuery(id: string) {
  return infiniteQueryOptions({
    queryKey: playerKeys.tournaments(id),
    queryFn: ({ pageParam }) =>
      fetchPlayerTournaments(id, { page: pageParam, limit: TOURNAMENTS_PAGE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.limit < last.total ? last.page + 1 : undefined),
  });
}
