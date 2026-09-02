import type {
  CreatePlayerInput,
  HeadToHeadView,
  ListPlayersQuery,
  Page,
  PlayerMatchesQuery,
  PlayerMatchView,
  PlayerView,
  RatingHistoryQuery,
  RatingHistoryView,
  UpdatePlayerInput,
} from '@kttf/shared/types';

import { apiRequest, queryString } from '@/common/api';

/**
 * Контракт ТС 7.2, один в один.
 *
 * Список уже отсортирован сервером по рейтингу — сортировать заново на
 * клиенте нельзя: рейтинг приходит строкой, и сравнение строк даст порядок,
 * в котором «9.50» больше «100.00».
 */

export function listPlayers(query: ListPlayersQuery): Promise<Page<PlayerView>> {
  return apiRequest<Page<PlayerView>>(`/players${queryString(query)}`);
}

export function fetchPlayer(id: string): Promise<PlayerView> {
  return apiRequest<PlayerView>(`/players/${id}`);
}

/**
 * Заведение профиля.
 *
 * Один маршрут на два случая, и какой именно — решает сервер по наличию
 * профиля у вошедшего (ADR-014). Отсюда он вызывается только в первом:
 * человек заводит профиль себе, ТЗ 2.2.
 */
export function createPlayer(input: CreatePlayerInput): Promise<PlayerView> {
  return apiRequest<PlayerView>('/players', { method: 'POST', body: input });
}

export function updatePlayer(id: string, input: UpdatePlayerInput): Promise<PlayerView> {
  return apiRequest<PlayerView>(`/players/${id}`, { method: 'PATCH', body: input });
}

/**
 * История игрока — ТС 7.2, экран ТЗ 9.3.
 *
 * Открыта без входа, как и остальное чтение: результаты турниров — спортивный
 * факт, а не персональные данные.
 */

export function fetchRatingHistory(
  id: string,
  query: RatingHistoryQuery = {},
): Promise<RatingHistoryView> {
  return apiRequest<RatingHistoryView>(`/players/${id}/rating-history${queryString(query)}`);
}

export function fetchPlayerMatches(
  id: string,
  query: PlayerMatchesQuery,
): Promise<Page<PlayerMatchView>> {
  return apiRequest<Page<PlayerMatchView>>(`/players/${id}/matches${queryString(query)}`);
}

/** Личный счёт считает сервер: по одной странице истории он был бы неверным. */
export function fetchHeadToHead(id: string, opponentId: string): Promise<HeadToHeadView> {
  return apiRequest<HeadToHeadView>(`/players/${id}/head-to-head/${opponentId}`);
}
