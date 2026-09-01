import { DEFAULT_PAGE_SIZE } from '@kttf/shared/types';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { formatDateTime, useLocale, useT } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import { listTournaments } from '@/features/console/api';
import { consoleKeys } from '@/features/console/use-console';

export const Route = createFileRoute('/console/')({
  component: ConsolePage,
});

/**
 * Идущие турниры: с них начинается работа судьи.
 *
 * Список короткий по построению — в один момент клуб проводит один турнир,
 * поэтому фильтров здесь нет. Права проверяет сервер: чужой турнир откроется,
 * но действия в нём будут отклонены (ТС 8.3).
 */
const runningQuery = queryOptions({
  queryKey: consoleKeys.running,
  queryFn: () => listTournaments({ page: 1, limit: DEFAULT_PAGE_SIZE, status: 'RUNNING' }),
  staleTime: 30_000,
});

function ConsolePage(): ReactNode {
  const t = useT();
  const locale = useLocale();
  const running = useQuery(runningQuery);

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">{t('page.console.title')}</h1>
      <p className="mt-2 text-sm text-slate-400">{t('console.pick.lead')}</p>

      <div className="mt-6">
        <QueryState
          isPending={running.isPending}
          error={running.error}
          onRetry={() => void running.refetch()}
        >
          {running.data === undefined ? null : running.data.items.length === 0 ? (
            <p className="text-slate-400">{t('console.pick.empty')}</p>
          ) : (
            <ul className="space-y-2">
              {running.data.items.map((tournament) => (
                <li key={tournament.id}>
                  <Link
                    to="/console/$tournamentId"
                    params={{ tournamentId: tournament.id }}
                    className="block rounded border border-slate-700 bg-slate-800 p-4"
                  >
                    <span className="font-semibold">{tournament.name}</span>
                    <span className="mt-1 block text-sm text-slate-400">
                      {formatDateTime(tournament.startsAt, locale)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </QueryState>
      </div>
    </section>
  );
}
