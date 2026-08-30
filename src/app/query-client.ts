import { QueryClient } from '@tanstack/react-query';

/**
 * Клиент серверного состояния.
 *
 * Умолчания сознательно скромные: реальные значения подбираются под данные,
 * которых ещё нет. Одно решение принято заранее — повторы здесь не отвечают
 * за офлайн. Консоль судьи не полагается на них ни в чём: её операции уходят
 * в очередь синхронизации, а ввод счёта не ждёт сети вовсе (запрет №1).
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}
