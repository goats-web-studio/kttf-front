import type { MatchResultInput, MatchView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useRef, useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { fill, useT } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import { isPlayedOut, matchesOf } from '@/features/console/group-matches';
import MatchDialog from '@/features/console/match-dialog';
import PlayedZone from '@/features/console/played-zone';
import {
  allPlayed,
  buildQueue,
  buildTables,
  matchLabel,
  playedMatches,
  progressOf,
  suggestedTable,
} from '@/features/console/queue';
import QueueZone from '@/features/console/queue-zone';
import { matchSetsToWin } from '@/features/console/score';
import StandingsPanel from '@/features/console/standings-panel';
import { namesOf, ratingsOf } from '@/features/console/state';
import SyncBadge, { SyncRejections } from '@/features/console/sync-badge';
import TableDialog from '@/features/console/table-dialog';
import TablesZone from '@/features/console/tables-zone';
import TiePanel from '@/features/console/tie-panel';
import { useConsole } from '@/features/console/use-console';
import { useNow } from '@/features/console/use-now';

export const Route = createFileRoute('/console/$tournamentId')({
  component: ConsoleScreen,
});

/** Что открыто поверх зала: окно встречи или окно свободного стола. */
type Opened =
  | { readonly kind: 'match'; readonly matchId: string }
  | { readonly kind: 'table'; readonly number: number }
  | null;

interface Toast {
  readonly key: number;
  readonly message: string;
  readonly action: { readonly label: string; readonly run: () => void } | null;
}

/**
 * Экран проведения турнира — ТЗ 6.1.
 *
 * Одна страница: столы, очередь, таблицы с разрешением равенства (ADR-008)
 * и последние результаты для правки счёта. Ссылка на экран зала — в шапке,
 * там, где судья ищет её перед турниром.
 *
 * Все действия — в окнах поверх зала. Касание стола или встречи открывает
 * окно ровно с теми действиями, которые сейчас возможны. После действия окно
 * закрывается само, а внизу появляется подтверждение с отменой: судья видит,
 * что нажал, и исправляет промах одним касанием.
 *
 * Ни одно действие не ждёт ответа сервера — запрет №1 брифа. Введённое
 * ложится в очередь на диск и уходит на сервер само; состояние связи и длина
 * очереди видны постоянно (ТС 6.4).
 */
function ConsoleScreen(): ReactNode {
  const t = useT();
  const { tournamentId } = Route.useParams();
  const { state, assign, result, cancel, tie, finish, queue } = useConsole(tournamentId);
  const now = useNow(30_000);

  const standingsRef = useRef<HTMLElement>(null);
  const [opened, setOpened] = useState<Opened>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const snapshot = state.data;

  const view = useMemo(() => {
    if (snapshot === undefined) {
      return null;
    }

    const tables = buildTables(snapshot.tournament.tableCount, snapshot.stages);

    return {
      tables,
      queue: buildQueue(snapshot.stages),
      played: playedMatches(snapshot.stages),
      suggested: suggestedTable(tables),
      names: namesOf(snapshot),
      ratings: ratingsOf(snapshot),
      progress: progressOf(snapshot.stages),
      done: allPlayed(snapshot.stages),
      ties: snapshot.standings.groups.some(
        (group) => group.unresolved.length > 0 && isPlayedOut(matchesOf(snapshot.stages, group)),
      ),
    };
  }, [snapshot]);

  function setsToWinOf(match: MatchView): number {
    const stage = snapshot?.stages.find((current) => current.id === match.stageId);

    return stage === undefined || snapshot === undefined
      ? 3
      : matchSetsToWin(snapshot.tournament.formatConfig, stage, match);
  }

  function findMatch(matchId: string): MatchView | undefined {
    return snapshot?.stages.flatMap((stage) => stage.matches).find((match) => match.id === matchId);
  }

  function pairOf(match: MatchView): string {
    const name = (id: string | null): string =>
      id === null ? t('console.match.pending') : (view?.names.get(id) ?? '');

    return `${name(match.playerAId)} — ${name(match.playerBId)}`;
  }

  function notify(message: string, action: Toast['action']): void {
    setToast({ key: Date.now(), message, action });
  }

  function doAssign(match: MatchView, tableNumber: number): void {
    setOpened(null);
    assign(match.id, tableNumber);
    notify(
      fill(t('console.toast.assigned'), { number: String(tableNumber), pair: pairOf(match) }),
      {
        label: t('console.toast.undo'),
        run: () => {
          cancel(match.id);
        },
      },
    );
  }

  function doResult(match: MatchView, input: MatchResultInput, correcting: boolean): void {
    setOpened(null);
    // Правка уже введённого результата уходит другим типом операции и
    // фиксируется в журнале — ТЗ 6.3.
    result(match.id, input, correcting);
    notify(
      fill(t('console.toast.recorded'), {
        score: `${String(input.setsA)}:${String(input.setsB)}`,
      }),
      {
        label: t('console.toast.edit'),
        run: () => {
          setOpened({ kind: 'match', matchId: match.id });
        },
      },
    );
  }

  const openedMatch = opened?.kind === 'match' ? findMatch(opened.matchId) : undefined;
  const openedTable =
    opened?.kind === 'table'
      ? view?.tables.find((table) => table.number === opened.number)
      : undefined;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <Box
        component="header"
        sx={{
          // На телефоне шапка с кнопками заняла бы четверть экрана — там она
          // уезжает вместе с лентой; закреплена только на широком.
          position: { xs: 'static', lg: 'sticky' },
          top: 0,
          zIndex: 'appBar',
          bgcolor: 'background.default',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            mx: 'auto',
            maxWidth: 1440,
            px: 2,
            py: 1.5,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
          }}
        >
          <Box sx={{ minWidth: 0, flex: '1 1 240px' }}>
            <Link href="/console" variant="caption" color="text.secondary" underline="always">
              {t('page.console.title')}
            </Link>
            <Typography
              variant="h1"
              sx={{
                fontSize: 22,
                lineHeight: '26px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {snapshot?.tournament.name ?? ''}
            </Typography>
            {view !== null && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {fill(t('console.progress'), {
                  done: String(view.progress.done),
                  total: String(view.progress.total),
                })}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
            {snapshot !== undefined && (
              <TvLink
                token={snapshot.tournament.publicToken}
                onCopied={() => {
                  notify(t('console.tv.copied'), null);
                }}
              />
            )}
            <SyncBadge queue={queue} />
          </Box>
        </Box>
      </Box>

      <Box
        component="main"
        sx={{ mx: 'auto', width: '100%', maxWidth: 1440, px: 2, py: 2, flexGrow: 1 }}
      >
        <SyncRejections queue={queue} />

        <QueryState
          isPending={state.isPending}
          error={state.error}
          onRetry={() => void state.refetch()}
        >
          {snapshot === undefined || view === null ? null : (
            <>
              {view.ties && (
                <Alert
                  severity="warning"
                  variant="outlined"
                  action={
                    <Button
                      color="warning"
                      onClick={() => {
                        standingsRef.current?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      sx={{ minHeight: 44 }}
                    >
                      {t('console.tie.open')}
                    </Button>
                  }
                  sx={{ mb: 2, alignItems: 'center' }}
                >
                  {t('console.tie.alert')}
                </Alert>
              )}

              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {t('console.hint.tap')}
              </Typography>

              {/* Одна страница, а не вкладки: судья видит зал, очередь и
                  таблицы разом и не ищет, где спрятано нужное. На широком
                  экране — две колонки, на телефоне — одна лента. */}
              <Box
                sx={{
                  display: 'grid',
                  gap: 3,
                  alignItems: 'start',
                  gridTemplateColumns: {
                    xs: 'minmax(0, 1fr)',
                    lg: 'minmax(0, 2fr) minmax(0, 1fr)',
                  },
                }}
              >
                {/* На телефоне обёртки колонок растворяются (`contents`), и
                    порядок задают сами блоки: столы, очередь, таблицы,
                    сыгранные — в том порядке, в каком судья к ним обращается. */}
                <Box sx={COLUMN}>
                  <Box sx={{ order: 1 }}>
                    <TablesZone
                      tables={view.tables}
                      names={view.names}
                      now={now}
                      onOpen={(table) => {
                        setOpened(
                          table.status === 'PLAYING' && table.match !== null
                            ? { kind: 'match', matchId: table.match.id }
                            : { kind: 'table', number: table.number },
                        );
                      }}
                    />
                  </Box>

                  <Box
                    ref={standingsRef}
                    sx={{
                      order: 3,
                      display: 'grid',
                      gap: 3,
                      gridTemplateColumns: 'minmax(0, 1fr)',
                      scrollMarginTop: 96,
                    }}
                  >
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
                  </Box>
                </Box>

                <Box sx={COLUMN}>
                  <Box sx={{ order: 2 }}>
                    <QueueZone
                      queue={view.queue}
                      suggested={view.suggested}
                      names={view.names}
                      onAssign={(matchId, tableNumber) => {
                        const match = findMatch(matchId);

                        if (match !== undefined) doAssign(match, tableNumber);
                      }}
                      onOpen={(matchId) => {
                        setOpened({ kind: 'match', matchId });
                      }}
                    />
                  </Box>
                  <Box sx={{ order: 4 }}>
                    <PlayedZone
                      matches={view.played}
                      stages={snapshot.stages}
                      names={view.names}
                      onOpen={(matchId) => {
                        setOpened({ kind: 'match', matchId });
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </>
          )}
        </QueryState>
      </Box>

      {view?.done === true && snapshot?.tournament.status === 'RUNNING' && (
        <Box
          component="section"
          sx={{
            position: 'sticky',
            bottom: 0,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ mx: 'auto', maxWidth: 1440, px: 2, py: 1.5 }}>
            {/* Завершение — единственное действие консоли, которому нужна
                сеть: рейтинг считает сервер (ТС 6.2, ADR-022). Пока очередь
                не ушла, закрывать турнир нечем — сервер не видел половины
                результатов. */}
            <Button
              variant="contained"
              size="large"
              fullWidth
              disabled={finish.isPending || queue.queued > 0 || queue.connection === 'OFFLINE'}
              onClick={() => {
                finish.mutate();
              }}
              sx={{ minHeight: 56, fontWeight: 600, maxWidth: { sm: 480 } }}
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
          </Box>
        </Box>
      )}

      {openedMatch !== undefined && view !== null && snapshot !== undefined && (
        <MatchDialog
          key={openedMatch.id}
          match={openedMatch}
          label={matchLabel(snapshot.stages, openedMatch)}
          names={view.names}
          ratings={view.ratings}
          tables={view.tables}
          suggested={view.suggested}
          setsToWin={setsToWinOf(openedMatch)}
          now={now}
          onClose={() => {
            setOpened(null);
          }}
          onAssign={(tableNumber) => {
            doAssign(openedMatch, tableNumber);
          }}
          onResult={(input, correcting) => {
            doResult(openedMatch, input, correcting);
          }}
          onCancel={() => {
            setOpened(null);
            cancel(openedMatch.id);
          }}
        />
      )}

      {openedTable !== undefined && view !== null && (
        <TableDialog
          key={openedTable.number}
          table={openedTable}
          queue={view.queue}
          names={view.names}
          onClose={() => {
            setOpened(null);
          }}
          onCall={(matchId) => {
            const match = findMatch(matchId);

            if (match !== undefined) doAssign(match, openedTable.number);
          }}
          onOpenMatch={(matchId) => {
            setOpened({ kind: 'match', matchId });
          }}
        />
      )}

      <Snackbar
        key={toast?.key}
        open={toast !== null}
        autoHideDuration={6000}
        onClose={(_event, reason) => {
          // Касание мимо не должно прятать отмену: судья как раз тянется к ней.
          if (reason !== 'clickaway') setToast(null);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        message={toast?.message}
        action={
          toast?.action == null ? undefined : (
            <Button
              color="primary"
              onClick={() => {
                toast.action?.run();
                setToast(null);
              }}
              sx={{ minHeight: 44 }}
            >
              {toast.action.label}
            </Button>
          )
        }
        // Над панелью завершения, когда она есть, а не поверх её кнопки.
        sx={view?.done === true ? { bottom: { xs: 96, sm: 104 } } : undefined}
        // Светлая плашка MUI по умолчанию в ночной теме слепит и гасит
        // красную кнопку отмены: плашка в цвет карточки с рамкой.
        slotProps={{
          content: {
            sx: {
              bgcolor: 'background.paper',
              color: 'text.primary',
              border: 1,
              borderColor: 'divider',
              flexWrap: 'nowrap',
            },
          },
        }}
      />
    </Box>
  );
}

/** Колонка широкого экрана; на телефоне растворяется в общую ленту. */
const COLUMN = {
  display: { xs: 'contents', lg: 'grid' },
  gap: 3,
  gridTemplateColumns: 'minmax(0, 1fr)',
} as const;

/**
 * Ссылка на экран зала — в шапке консоли, где судья её и ищет перед турниром.
 *
 * Открывается в новой вкладке: её перетаскивают на телевизор или второй
 * монитор, а консоль остаётся на месте. Рядом копирование — чтобы отправить
 * ссылку на ноутбук у телевизора.
 */
function TvLink({
  token,
  onCopied,
}: {
  readonly token: string;
  readonly onCopied: () => void;
}): ReactNode {
  const t = useT();
  const url = `${window.location.origin}/screen/${token}`;

  return (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      <Button
        variant="contained"
        component="a"
        href={url}
        target="_blank"
        rel="noopener"
        sx={{ minHeight: 44, whiteSpace: 'nowrap' }}
      >
        {t('console.tv')}
      </Button>
      <Button
        onClick={() => {
          void navigator.clipboard.writeText(url).then(onCopied);
        }}
        sx={{ minHeight: 44, whiteSpace: 'nowrap' }}
      >
        {t('console.tv.copy')}
      </Button>
    </Box>
  );
}
