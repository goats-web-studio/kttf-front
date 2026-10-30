import type { FormatConfig, MatchResultInput, MatchView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Snackbar from '@mui/material/Snackbar';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { ChevronLeft, Copy, SlidersHorizontal, Tv, Users } from 'lucide-react';
import { lazy, Suspense, useMemo, useRef, useState, type ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';
import { hasBracket } from '@/common/ui/bracket-model';
import QueryState from '@/common/ui/query-state';
import BracketZone from '@/features/console/bracket-zone';
import FinishDialog from '@/features/console/finish-dialog';
import FinishedPanel from '@/features/console/finished-panel';
import { isPlayedOut, matchesOf } from '@/features/console/group-matches';
import MatchDialog, { type WithdrawStatus } from '@/features/console/match-dialog';
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
import { actualDeltas, deltasOf, namesOf, ratingsOf, withdrawnOf } from '@/features/console/state';
import SyncBadge, { SyncRejections } from '@/features/console/sync-badge';
import TableDialog from '@/features/console/table-dialog';
import TablesZone from '@/features/console/tables-zone';
import TiePanel from '@/features/console/tie-panel';
import { shortNamesOf } from '@/features/screen/names';
import { consoleResultsQuery, useConsole } from '@/features/console/use-console';
import { useNow } from '@/features/console/use-now';

/**
 * «Столы и длины» — лениво (ADR-061). Окну нужна сеть, и грузить его заранее
 * незачем: со списками и полями длины оно выводило набор консоли за бюджет
 * precache (ADR-032). Чанк всё равно предзагружен — его просто нет в
 * обязательном наборе.
 */
const RunningSettings = lazy(() => import('@/features/console/running-settings'));
// Состав с поиском и формой игрока — отдельным чанком: в офлайн-бюджет
// консоли (ADR-004) он не входит, нужен он только при сети.
const ParticipantsDialog = lazy(() => import('@/features/console/participants-dialog'));

/**
 * Предпросмотр ТВ — отдельным чанком (ADR-082): стена тянет за собой свои
 * модули, а судье для работы они не нужны. Чанк всё равно предзагружен
 * service worker'ом и открывается без сети.
 */
const TvCard = lazy(() => import('@/features/console/tv-card'));

export const Route = createFileRoute('/console/$tournamentId')({
  component: ConsoleScreen,
});

/**
 * Нижняя часть консоли — вкладками: таблицы групп, сетка плей-офф и
 * сыгранные встречи.
 */
type Lower = 'standings' | 'bracket' | 'played';

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
  const { state, assign, result, cancel, tie, withdraw, online, finish, queue } =
    useConsole(tournamentId);
  const now = useNow(30_000);

  const standingsRef = useRef<HTMLElement>(null);
  const [opened, setOpened] = useState<Opened>(null);
  const [lower, setLower] = useState<Lower>('standings');
  const [toast, setToast] = useState<Toast | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [settings, setSettings] = useState(false);
  // Состав — опоздавший, замена, снятие, оплата — прямо из консоли (ADR-076).
  const [participants, setParticipants] = useState(false);

  const snapshot = state.data;
  // Счёт принимает только идущий турнир: сервер отклонит любое действие
  // закрытого (TOURNAMENT_NOT_RUNNING), и консоль не должна его предлагать.
  const running = snapshot?.tournament.status === 'RUNNING';

  const view = useMemo(() => {
    if (snapshot === undefined) {
      return null;
    }

    // Снявшиеся и не явившиеся (ADR-061): их встречи не зовутся к столу,
    // не занимают его и не держат ни панель равенства, ни завершение.
    const withdrawn = withdrawnOf(snapshot);
    // Сыгранная встреча держит стол минуту (ADR-082), потом стол свободен.
    const tables = buildTables(snapshot.tournament.tableCount, snapshot.stages, withdrawn, now);

    return {
      tables,
      withdrawn,
      queue: buildQueue(snapshot.stages, t, withdrawn),
      played: playedMatches(snapshot.stages),
      suggested: suggestedTable(tables),
      names: namesOf(snapshot),
      // На плитке стола — «Фамилия И.», как на ТВ: многоточие не читается.
      short: shortNamesOf(snapshot.registrations.map((registration) => registration.player)),
      ratings: ratingsOf(snapshot),
      // Прогноз рейтинга по сыгранному — ADR-077.
      deltas: deltasOf(snapshot),
      progress: progressOf(snapshot.stages, withdrawn),
      done: allPlayed(snapshot.stages, withdrawn),
      bracket: hasBracket(snapshot.stages),
      ties: snapshot.standings.groups.some(
        (group) =>
          group.unresolved.length > 0 && isPlayedOut(matchesOf(snapshot.stages, group), withdrawn),
      ),
    };
  }, [snapshot, t, now]);

  // После начисления — фактическая дельта из журнала, до него — прогноз.
  const rated = snapshot?.tournament.status === 'RATED';
  const ratedResults = useQuery({ ...consoleResultsQuery(tournamentId), enabled: rated });
  const deltas =
    rated && ratedResults.data !== undefined
      ? actualDeltas(ratedResults.data.ratings)
      : view?.deltas;

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

  function openMatch(matchId: string): void {
    setOpened({ kind: 'match', matchId });
  }

  function notify(message: string, action: Toast['action']): void {
    setToast({ key: Date.now(), message, action });
  }

  function doAssign(match: MatchView, tableNumber: number): void {
    setOpened(null);
    assign(match.id, tableNumber);
    notify(
      fill(t('console.toast.assigned'), {
        number: String(tableNumber),
        pair: pairOf(match),
        stage: snapshot === undefined ? '' : matchLabel(snapshot.stages, match, t),
      }),
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

  function doWithdraw(playerId: string, status: WithdrawStatus): void {
    const registration = snapshot?.registrations.find((entry) => entry.player.id === playerId);

    if (registration === undefined) return;

    setOpened(null);
    withdraw(registration.id, status);
    notify(
      fill(t(status === 'NO_SHOW' ? 'console.toast.noShow' : 'console.toast.withdrawn'), {
        name: view?.names.get(playerId) ?? '',
      }),
      {
        label: t('console.toast.undo'),
        run: () => {
          withdraw(registration.id, 'CONFIRMED');
        },
      },
    );
  }

  // Вкладки «Сетка» нет у турнира без плей-офф — выбранной она тоже не бывает.
  const shown: Lower = lower === 'bracket' && view?.bracket !== true ? 'standings' : lower;

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
          bgcolor: 'background.paper',
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
            {/* Назад — на страницу турнира, а не в список идущих: после
                завершения список пуст, и судья упирался в пустую страницу. */}
            <Link
              href={`/tournaments/${tournamentId}`}
              variant="caption"
              color="text.secondary"
              underline="none"
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, fontWeight: 600 }}
            >
              <ChevronLeft size={14} aria-hidden />
              {t('console.back')}
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
              // Прогресс полосой и словами: сколько сыграно видно с вытянутой
              // руки, а число остаётся для точности.
              <Box sx={{ mt: 0.75, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  aria-hidden
                  sx={{
                    flex: '0 1 220px',
                    height: 6,
                    borderRadius: 999,
                    bgcolor: 'var(--line)',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${String(
                        view.progress.total === 0
                          ? 0
                          : Math.round((view.progress.done / view.progress.total) * 100),
                      )}%`,
                      bgcolor: 'var(--red-600)',
                      borderRadius: 999,
                      transition: 'width var(--dur-slow) var(--ease)',
                    }}
                  />
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
                >
                  {fill(t('console.progress'), {
                    done: String(view.progress.done),
                    total: String(view.progress.total),
                  })}
                </Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
            {snapshot !== undefined &&
              snapshot.tournament.status !== 'FINISHED' &&
              snapshot.tournament.status !== 'RATED' && (
                <Button
                  onClick={() => {
                    setParticipants(true);
                  }}
                  startIcon={<Users size={18} aria-hidden />}
                  sx={{ minHeight: 44, whiteSpace: 'nowrap' }}
                  data-console-participants-open
                >
                  {t('console.participants.open')}
                </Button>
              )}
            {running && (
              <Button
                onClick={() => {
                  setSettings(true);
                }}
                startIcon={<SlidersHorizontal size={18} aria-hidden />}
                sx={{ minHeight: 44, whiteSpace: 'nowrap' }}
              >
                {t('console.settings.open')}
              </Button>
            )}
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
              {!running &&
                (snapshot.tournament.status === 'FINISHED' ||
                snapshot.tournament.status === 'RATED' ? (
                  <FinishedPanel
                    tournamentId={tournamentId}
                    status={snapshot.tournament.status}
                    played={view.progress.done}
                    onRate={() => {
                      finish.mutate();
                    }}
                    rating={{ isPending: finish.isPending, error: finish.error }}
                    onCopied={() => {
                      notify(t('console.done.copied'), null);
                    }}
                  />
                ) : (
                  <Alert severity="info" variant="outlined">
                    {t('console.idle')}
                  </Alert>
                ))}

              {running && view.ties && (
                <Alert
                  severity="warning"
                  variant="outlined"
                  action={
                    <Button
                      color="warning"
                      onClick={() => {
                        setLower('standings');
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

              {running && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {t('console.hint.tap')}
                </Typography>
              )}

              {/* Сверху — рабочая зона судьи: столы и очередь рядом, как
                  панели «Играется» и «В ожидании» у турнир-менеджера RTTF.
                  Таблицы и сыгранные — ниже вкладками: раньше всё висело
                  одной лентой, и консоль читалась нагромождением.
                  У закрытого турнира звать и записывать некого — зоны нет. */}
              {running && (
                <Box
                  sx={{
                    display: 'grid',
                    gap: 3,
                    alignItems: 'start',
                    gridTemplateColumns: {
                      xs: 'minmax(0, 1fr)',
                      lg: 'minmax(0, 3fr) minmax(0, 2fr)',
                    },
                  }}
                >
                  <TablesZone
                    tables={view.tables}
                    names={view.short}
                    labelOf={(match) => matchLabel(snapshot.stages, match, t)}
                    now={now}
                    onOpen={(table) => {
                      setOpened(
                        table.status === 'PLAYING' && table.match !== null
                          ? { kind: 'match', matchId: table.match.id }
                          : { kind: 'table', number: table.number },
                      );
                    }}
                  />
                  <Box sx={{ display: 'grid', gap: 3, alignContent: 'start' }}>
                    <QueueZone
                      queue={view.queue}
                      suggested={view.suggested}
                      names={view.names}
                      playing={view.tables
                        .filter((table) => table.status === 'PLAYING')
                        .map((table) => table.number)}
                      onAssign={(matchId, tableNumber) => {
                        const match = findMatch(matchId);

                        if (match !== undefined) doAssign(match, tableNumber);
                      }}
                      onOpen={(matchId) => {
                        setOpened({ kind: 'match', matchId });
                      }}
                    />
                    <Suspense fallback={null}>
                      <TvCard
                        snapshot={snapshot}
                        withdrawn={view.withdrawn}
                        results={undefined}
                        online={online}
                      />
                    </Suspense>
                  </Box>
                </Box>
              )}

              <Box ref={standingsRef} sx={{ mt: 5, scrollMarginTop: 96 }}>
                <Tabs
                  value={shown}
                  onChange={(_, next: Lower) => {
                    setLower(next);
                  }}
                  aria-label={t('console.lower.label')}
                  variant="scrollable"
                  scrollButtons={false}
                >
                  <Tab value="standings" label={t('console.standings.title')} />
                  {view.bracket && <Tab value="bracket" label={t('console.bracket.title')} />}
                  <Tab value="played" label={t('console.played.title')} />
                </Tabs>

                <Box
                  // Новый ключ на каждую вкладку — панель монтируется заново и
                  // проявляется (styles.css, .tab-panel-in).
                  key={shown}
                  className="tab-panel-in"
                  // minmax(0, 1fr): без него колонка грида растягивается по
                  // самой широкой таблице группы, и на телефоне вбок уезжала
                  // вся страница, а не таблица внутри своей карточки.
                  sx={{ mt: 2.5, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 3 }}
                >
                  {shown === 'standings' ? (
                    <>
                      {running && (
                        <TiePanel
                          groups={snapshot.standings.groups}
                          stages={snapshot.stages}
                          withdrawn={view.withdrawn}
                          names={view.names}
                          onDecide={(input) => {
                            tie(input);
                          }}
                          isPending={false}
                        />
                      )}
                      <StandingsPanel
                        groups={snapshot.standings.groups}
                        stages={snapshot.stages}
                        names={view.names}
                        ratings={view.ratings}
                        {...(deltas === undefined ? {} : { deltas })}
                        advance={advanceOf(snapshot.tournament.formatConfig)}
                      />
                    </>
                  ) : shown === 'bracket' ? (
                    <BracketZone
                      stages={snapshot.stages}
                      names={view.names}
                      onOpen={running ? openMatch : undefined}
                    />
                  ) : (
                    <PlayedZone
                      matches={view.played}
                      stages={snapshot.stages}
                      names={view.names}
                      onOpen={running ? openMatch : undefined}
                    />
                  )}
                </Box>
              </Box>
            </>
          )}
        </QueryState>
      </Box>

      {view?.done === true && running && (
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
                результатов. Нажатие сначала показывает итоги — окно
                подтверждения, закрывает турнир уже оно. */}
            <Button
              variant="contained"
              size="large"
              fullWidth
              disabled={finish.isPending || queue.queued > 0 || queue.connection === 'OFFLINE'}
              onClick={() => {
                finish.reset();
                setConfirming(true);
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
          </Box>
        </Box>
      )}

      {confirming && running && (
        <FinishDialog
          tournamentId={tournamentId}
          project={(placements) => deltasOf(snapshot, placements)}
          isPending={finish.isPending}
          error={finish.error}
          onConfirm={() => {
            finish.mutate(undefined, {
              onSuccess: () => {
                setConfirming(false);
                // Панель «Турнир завершён» — в начале страницы, а судья
                // нажимал кнопку внизу.
                window.scrollTo({ top: 0, behavior: 'smooth' });
              },
            });
          }}
          onClose={() => {
            setConfirming(false);
          }}
        />
      )}

      {openedMatch !== undefined && running && view !== null && (
        <MatchDialog
          key={openedMatch.id}
          match={openedMatch}
          label={matchLabel(snapshot.stages, openedMatch, t)}
          names={view.names}
          ratings={view.ratings}
          tables={view.tables}
          suggested={view.suggested}
          busyTable={view.queue.find((item) => item.match.id === openedMatch.id)?.busyTable ?? null}
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
          onWithdraw={doWithdraw}
        />
      )}

      {participants && snapshot !== undefined && (
        <Suspense fallback={null}>
          <ParticipantsDialog
            tournament={snapshot.tournament}
            online={online && queue.connection !== 'OFFLINE'}
            onClose={() => {
              setParticipants(false);
              // Правки ушли на сервер напрямую — снимок консоли перечитывается.
              queue.syncNow();
              void state.refetch();
            }}
          />
        </Suspense>
      )}

      {settings && running && (
        <Suspense fallback={null}>
          <RunningSettings
            tournament={snapshot.tournament}
            stages={snapshot.stages}
            participants={snapshot.registrations.length}
            online={online && queue.connection !== 'OFFLINE'}
            onClose={() => {
              setSettings(false);
            }}
            onSaved={() => {
              setSettings(false);
              queue.syncNow();
              notify(t('console.settings.saved'), null);
            }}
          />
        </Suspense>
      )}

      {openedTable !== undefined && running && view !== null && (
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
        sx={view?.done === true && running ? { bottom: { xs: 96, sm: 104 } } : undefined}
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
    // Экран для зала — не главное действие консоли: главное — вызвать пару
    // и ввести счёт. Поэтому обе кнопки обводкой, залитая остаётся очереди.
    <Box
      sx={{
        display: 'flex',
        gap: 0.5,
        width: { xs: '100%', sm: 'auto' },
        // На телефоне кнопки делят строку поровну и без иконок: с иконкой
        // «Скопировать ссылку» вылезала за край экрана в 360px.
        '& .MuiButton-root': { flex: { xs: '1 1 0', sm: '0 0 auto' }, minWidth: 0 },
        '& .MuiButton-startIcon': { display: { xs: 'none', sm: 'inherit' } },
      }}
    >
      <Button
        component="a"
        href={url}
        target="_blank"
        rel="noopener"
        startIcon={<Tv size={18} aria-hidden />}
        sx={{ minHeight: 44, whiteSpace: 'nowrap' }}
      >
        {t('console.tv')}
      </Button>
      <Button
        onClick={() => {
          void navigator.clipboard.writeText(url).then(onCopied);
        }}
        startIcon={<Copy size={18} aria-hidden />}
        sx={{ minHeight: 44, whiteSpace: 'nowrap' }}
      >
        {t('console.tv.copy')}
      </Button>
    </Box>
  );
}

/** Сколько выходит из группы дальше — зона выхода в таблице, как на экране зала. */
function advanceOf(config: FormatConfig): number | null {
  return config.type === 'GROUPS_KNOCKOUT' || config.type === 'GROUPS_FINAL_GROUPS'
    ? config.advancePerGroup
    : null;
}
