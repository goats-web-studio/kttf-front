import { createFileRoute } from '@tanstack/react-router';
import { useMemo, type ReactNode } from 'react';

import { formatDateTime, useLocale, useT } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import { buildQueue, buildTables } from '@/features/console/queue';
import { namesOf, ratingsOf } from '@/features/screen/names';
import QueueBoard from '@/features/screen/queue-board';
import StandingsBoard from '@/features/screen/standings-board';
import TablesBoard from '@/features/screen/tables-board';
import { useScreen } from '@/features/screen/use-screen';

export const Route = createFileRoute('/screen/$publicToken')({
  component: ScreenPage,
});

/**
 * Второй экран зала — ТЗ 6.5, ТС 7.7.
 *
 * Без авторизации и без общей оболочки: это монитор на стене, а не страница
 * для человека с телефоном. Доступ даёт публичный токен в адресе.
 *
 * Столы и очередь считаются теми же функциями, что и в консоли судьи
 * (`features/console/queue`), а не своими: стена и судья обязаны видеть
 * одинаковый порядок вызова пар. Функции чистые и ничего за собой в чанк
 * экрана не тянут.
 */
function ScreenPage(): ReactNode {
  const t = useT();
  const locale = useLocale();
  const { publicToken } = Route.useParams();
  const { view, isPending, error, live, retry } = useScreen(publicToken);

  const boards = useMemo(() => {
    if (view === undefined) {
      return null;
    }

    return {
      tables: buildTables(view.tournament.tableCount, view.stages),
      queue: buildQueue(view.stages),
      names: namesOf(view.players),
      ratings: ratingsOf(view.players),
    };
  }, [view]);

  return (
    <div className="min-h-full bg-black px-6 py-5 text-white">
      <QueryState isPending={isPending} error={error} onRetry={retry}>
        {view === undefined || boards === null ? null : (
          <>
            <header className="flex items-baseline justify-between gap-6 border-b border-slate-800 pb-3">
              <h1 className="text-4xl font-bold">{view.tournament.name}</h1>

              <p className="text-lg text-slate-400">
                {/* Метка связи важнее времени: на стене висит последнее
                    известное состояние, и зритель обязан знать, что оно
                    перестало обновляться. */}
                {live ? (
                  formatDateTime(view.updatedAt, locale)
                ) : (
                  <span className="text-amber-400">
                    {t('screen.offline')} · {formatDateTime(view.updatedAt, locale)}
                  </span>
                )}
              </p>
            </header>

            <div className="mt-5 grid gap-8 xl:grid-cols-[2fr_1fr]">
              <TablesBoard tables={boards.tables} names={boards.names} />
              <QueueBoard queue={boards.queue} names={boards.names} />
            </div>

            <div className="mt-8">
              <StandingsBoard
                groups={view.standings.groups}
                names={boards.names}
                ratings={boards.ratings}
              />
            </div>
          </>
        )}
      </QueryState>
    </div>
  );
}
