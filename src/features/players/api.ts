import type { ListPlayersQuery, Page, PlayerView } from '@kttf/shared/types';

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
