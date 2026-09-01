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
 * Ни одно действие не ждёт ответа сервера — запрет №1 брифа. Неотправленное
 * висит в списке сверху с повтором и не пропадает молча.
 */
function ConsoleScreen(): ReactNode {
  const t = useT();
  const { tournamentId } = Route.useParams();
  const { state, assign, result, cancel, tie, finish, failures, dismiss } =
    useConsole(tournamentId);

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
      <header className="flex items-baseline gap-4">
        <Link to="/console" className="text-sm text-slate-400 underline">
          {t('page.console.title')}
        </Link>
        <h1 className="text-lg font-semibold">{snapshot?.tournament.name ?? ''}</h1>
      </header>

      {failures.length > 0 && (
        <ul className="mt-3 space-y-2">
          {failures.map((failure) => (
            <li
              key={failure.id}
              className="flex items-center gap-3 rounded border border-red-700 bg-red-950 p-2 text-sm"
            >
              <span role="alert" className="grow text-red-200">
                {t('console.failure.lead')} {t(errorMessageKey(failure.error))}
              </span>
              <button
                type="button"
                onClick={() => {
                  dismiss(failure.id);
                  failure.again();
                }}
                className="rounded bg-red-800 px-3 py-1"
              >
                {t('console.failure.retry')}
              </button>
              <button
                type="button"
                onClick={() => {
                  dismiss(failure.id);
                }}
                className="text-xs text-red-300 underline"
              >
                {t('console.failure.dismiss')}
              </button>
            </li>
          ))}
        </ul>
      )}

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
                  result.mutate({
                    matchId,
                    input,
                    // Правка уже введённого результата идёт другим маршрутом
                    // и фиксируется в журнале — ТЗ 6.3.
                    correcting: false,
                  });
                }}
                onCancel={(matchId) => {
                  cancel.mutate(matchId);
                }}
              />

              <QueueZone
                queue={view.queue}
                tables={view.tables}
                suggested={view.suggested}
                names={view.names}
                onAssign={(matchId, tableNumber) => {
                  assign.mutate({ matchId, tableNumber });
                }}
              />
            </div>

            <TiePanel
              groups={snapshot.standings.groups}
              names={view.names}
              onDecide={(input) => {
                tie.mutate(input);
              }}
              isPending={tie.isPending}
            />

            <StandingsPanel
              groups={snapshot.standings.groups}
              stages={snapshot.stages}
              names={view.names}
              ratings={view.ratings}
            />

            {view.done && snapshot.tournament.status === 'RUNNING' && (
              <section className="rounded border border-slate-700 bg-slate-800 p-3">
                <button
                  type="button"
                  disabled={finish.isPending}
                  onClick={() => {
                    finish.mutate();
                  }}
                  className="rounded bg-emerald-700 px-4 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {t('console.finish')}
                </button>
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
