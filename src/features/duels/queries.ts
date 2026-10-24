import type {
  DuelView,
  ListAdminDuelsQuery,
  ListDuelsQuery,
  ListMyDuelsQuery,
} from '@kttf/shared/types';
import { queryOptions, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { fetchDuel, listAdminDuels, listDuels, listMyDuels } from './api';

/**
 * Ключи — под одним корнем `duels`: отклик или счёт меняют и страницу
 * дуэли, и доску, и «Мои дуэли» в кабинете, и очередь администратора.
 */
export const duelKeys = {
  all: ['duels'] as const,
  board: (query: Partial<ListDuelsQuery>) => ['duels', 'board', query] as const,
  mine: (query: Partial<ListMyDuelsQuery>) => ['duels', 'mine', query] as const,
  detail: (duelId: string) => ['duels', 'detail', duelId] as const,
  admin: (query: Partial<ListAdminDuelsQuery>) => ['duels', 'admin', query] as const,
};

export function duelsBoardQuery(query: Partial<ListDuelsQuery>) {
  return queryOptions({
    queryKey: duelKeys.board(query),
    queryFn: () => listDuels(query),
  });
}

export function myDuelsQuery(query: Partial<ListMyDuelsQuery>) {
  return queryOptions({
    queryKey: duelKeys.mine(query),
    queryFn: () => listMyDuels(query),
  });
}

export function duelQuery(duelId: string) {
  return queryOptions({
    queryKey: duelKeys.detail(duelId),
    queryFn: () => fetchDuel(duelId),
  });
}

export function adminDuelsQuery(query: Partial<ListAdminDuelsQuery>) {
  return queryOptions({
    queryKey: duelKeys.admin(query),
    queryFn: () => listAdminDuels(query),
  });
}

/**
 * После действия: ответ — свежая страница дуэли, она встаёт в кэш сразу,
 * без второго запроса; списки, где дуэль видна, перечитываются.
 */
export function useDuelUpdated(): (view: DuelView) => Promise<void> {
  const queryClient = useQueryClient();

  return useCallback(
    async (view: DuelView) => {
      queryClient.setQueryData(duelKeys.detail(view.id), view);
      await queryClient.invalidateQueries({
        queryKey: duelKeys.all,
        predicate: (query) => query.queryKey[1] !== 'detail',
      });
    },
    [queryClient],
  );
}
