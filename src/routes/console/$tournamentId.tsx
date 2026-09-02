import type { MatchView } from '@kttf/shared/types';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import PlayingZone from '@/features/console/playing-zone';
import {
  allPlayed,
  buildQueue,
  buildTables,
  playingMatches,
  suggestedTable,
} from '@/features/console/queue';
import QueueZone from '@/features/console/queue-zone';
import { setsToWinFor } from '@/features/console/score';
import StandingsPanel from '@/features/console/standings-panel';
import { namesOf, ratingsOf } from '@/features/console/state';
import SyncBadge from '@/features/console/sync-badge';
import TablesZone from '@/features/console/tables-zone';
import TiePanel from '@/features/console/tie-panel';
import { useConsole } from '@/features/console/use-console';

export const Route = createFileRoute('/console/$tournamentId')({
  component: ConsoleScreen,
});

/**
 * Экран проведения турнира — ТЗ 6.1.
 *
 * Три зоны: столы, играется, очередь. Плюс таблицы и разрешение равенства,
 * без которого турнир не закрыть (ADR-008).
 *
 * Ни одно действие не ждёт ответа сервера — запрет №1 брифа. Введённое
 * ложится в очередь на диск и уходит на сервер само; состояние связи и длина
 * очереди видны постоянно (ТС 6.4).
 */
function ConsoleScreen(): ReactNode {
  const t = useT();
  const { tournamentId } = Route.useParams();
  const { state, assign, result, cancel, tie, finish, queue } = useConsole(tournamentId);

  const snapshot = state.data;

  const view = useMemo(() => {
    if (snapshot === undefined) {
      return null;
    }

    const tables = buildTables(snapshot.tournament.tableCount, snapshot.stages);

    return {
      tables,
      queue: buildQueue(snapshot.stages),
      playing: playingMatches(snapshot.stages),
      suggested: suggestedTable(tables),
      names: namesOf(snapshot),
      ratings: ratingsOf(snapshot),
      done: allPlayed(snapshot.stages),
    };
  }, [snapshot]);

  function setsToWinOf(match: MatchView): number {
    const stage = snapshot?.stages.find((current) => current.id === match.stageId);

    return stage === undefined || snapshot === undefined
      ? 3
      : setsToWinFor(snapshot.tournament.formatConfig, stage.type);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-4">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-4">
          <Link to="/console" className="text-sm text-slate-400 underline">
            {t('page.console.title')}
          </Link>
          <h1 className="text-lg font-semibold">{snapshot?.tournament.name ?? ''}</h1>
        </div>

        <SyncBadge queue={queue} />
      </header>

      <QueryState
        isPending={state.isPending}
        error={state.error}
        onRetry={() => void state.refetch()}
      >
        {snapshot === undefined || view === null ? null : (
          <div className="mt-4 space-y-6">
            <TablesZone tables={view.tables} names={view.names} />

            <div className="grid gap-6 lg:grid-cols-2">
              <PlayingZone
                matches={view.playing}
                names={view.names}
                setsToWinOf={setsToWinOf}
                onResult={(matchId, input) => {
                  // Правка уже введённого результата уходит другим типом
                  // операции и фиксируется в журнале — ТЗ 6.3.
                  result(matchId, input, false);
                }}
                onCancel={(matchId) => {
                  cancel(matchId);
                }}
              />

              <QueueZone
                queue={view.queue}
                tables={view.tables}
                suggested={view.suggested}
                names={view.names}
                onAssign={(matchId, tableNumber) => {
                  assign(matchId, tableNumber);
                }}
              />
            </div>

            <TiePanel
              groups={snapshot.standings.groups}
              names={view.names}
              onDecide={(input) => {
                tie(input);
              }}
              isPending={false}
            />

            <StandingsPanel
              groups={snapshot.standings.groups}
              stages={snapshot.stages}
              names={view.names}
              ratings={view.ratings}
            />

            {view.done && snapshot.tournament.status === 'RUNNING' && (
              <section className="rounded border border-slate-700 bg-slate-800 p-3">
                {/* Завершение — единственное действие консоли, которому нужна
                    сеть: рейтинг считает сервер (ТС 6.2, ADR-022). Пока очередь
                    не ушла, закрывать турнир нечем — сервер не видел половины
                    результатов. */}
                <button
                  type="button"
                  disabled={finish.isPending || queue.queued > 0 || queue.connection === 'OFFLINE'}
                  onClick={() => {
                    finish.mutate();
                  }}
                  className="rounded bg-emerald-700 px-4 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {t('console.finish')}
                </button>
                {queue.queued > 0 && (
                  <p className="mt-2 text-sm text-amber-300">{t('console.finish.queueFirst')}</p>
                )}
                {finish.error !== null && (
                  <p role="alert" className="mt-2 text-sm text-red-300">
                    {t(errorMessageKey(finish.error))}
                  </p>
                )}
              </section>
            )}
          </div>
        )}
      </QueryState>
    </div>
  );
}
