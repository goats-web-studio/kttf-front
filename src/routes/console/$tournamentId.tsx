import type { MatchView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { createFileRoute } from '@tanstack/react-router';
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
    <Box sx={{ mx: 'auto', width: '100%', maxWidth: 1152, px: 2, py: 2 }}>
      <Box
        component="header"
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <Link href="/console" variant="body2" color="text.secondary" underline="always">
            {t('page.console.title')}
          </Link>
          <Typography variant="h1" sx={{ fontSize: 22, lineHeight: '26px' }}>
            {snapshot?.tournament.name ?? ''}
          </Typography>
        </Box>

        <SyncBadge queue={queue} />
      </Box>

      <QueryState
        isPending={state.isPending}
        error={state.error}
        onRetry={() => void state.refetch()}
      >
        {snapshot === undefined || view === null ? null : (
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TablesZone tables={view.tables} names={view.names} />

            <Box
              sx={{
                display: 'grid',
                gap: 3,
                gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
              }}
            >
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
            </Box>

            <TiePanel
              groups={snapshot.standings.groups}
              stages={snapshot.stages}
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
              <Paper component="section" variant="outlined" sx={{ p: 1.5 }}>
                {/* Завершение — единственное действие консоли, которому нужна
                    сеть: рейтинг считает сервер (ТС 6.2, ADR-022). Пока очередь
                    не ушла, закрывать турнир нечем — сервер не видел половины
                    результатов. */}
                <Button
                  variant="contained"
                  size="large"
                  disabled={finish.isPending || queue.queued > 0 || queue.connection === 'OFFLINE'}
                  onClick={() => {
                    finish.mutate();
                  }}
                  sx={{ minHeight: 56, fontWeight: 600 }}
                >
                  {t('console.finish')}
                </Button>
                {queue.queued > 0 && (
                  <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                    {t('console.finish.queueFirst')}
                  </Typography>
                )}
                {finish.error !== null && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {t(errorMessageKey(finish.error))}
                  </Alert>
                )}
              </Paper>
            )}
          </Stack>
        )}
      </QueryState>
    </Box>
  );
}
