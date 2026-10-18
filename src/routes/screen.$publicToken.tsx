import type { FormatConfig, GroupStandingsView, MatchView, StageView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { isMissingResource } from '@/common/api';
import { fill, formatDateTime, useLocale, useT } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import ThemeRoot from '@/common/ui/theme';
import { matchesOf } from '@/features/console/group-matches';
import {
  buildQueue,
  buildTables,
  matchLabel,
  playedMatches,
  progressOf,
} from '@/features/console/queue';
import { useNow } from '@/features/console/use-now';
import BracketBoard from '@/features/screen/bracket-board';
import GroupBoard from '@/features/screen/group-board';
import { namesOf, ratingsOf } from '@/features/screen/names';
import QueueBoard from '@/features/screen/queue-board';
import RecentBoard from '@/features/screen/recent-board';
import { BOARD_TITLE, DISPLAY, size } from '@/features/screen/scale';
import TablesBoard from '@/features/screen/tables-board';
import { useScreen } from '@/features/screen/use-screen';

export const Route = createFileRoute('/screen/$publicToken')({
  component: ScreenRoute,
});

/**
 * Второй экран зала — ТЗ 6.5, ТС 7.7.
 *
 * Без авторизации и без общей оболочки: это телевизор на стене, а не
 * страница для человека с телефоном. Доступ даёт публичный токен в адресе.
 *
 * Слева то, что меняется каждую минуту: столы, кто следующий, последние
 * результаты. Справа большая доска: группы матрицей «каждый с каждым» и
 * сетка плей-офф, страницы листаются сами.
 *
 * Столы и очередь считаются теми же функциями, что и в консоли судьи
 * (`features/console/queue`), а не своими: стена и судья обязаны видеть
 * одинаковый порядок вызова пар.
 */
function ScreenRoute(): ReactNode {
  return (
    // Светлый, как и весь продукт (октябрь 2026): на экране зала белый фон
    // с чёрным текстом читается издалека не хуже, а выглядит своим.
    <ThemeRoot>
      <ScreenPage />
    </ThemeRoot>
  );
}

/** Сколько секунд висит одна страница большой доски. */
const PAGE_SECONDS = 15;

/** Страница большой доски: до двух групп или одна сетка плей-офф. */
type Page =
  | { readonly kind: 'groups'; readonly groups: readonly GroupStandingsView[] }
  | { readonly kind: 'bracket'; readonly stage: StageView };

function pagesOf(stages: readonly StageView[], groups: readonly GroupStandingsView[]): Page[] {
  const pages: Page[] = [];

  // Две группы на страницу: по шесть строк они помещаются одна над другой.
  for (let index = 0; index < groups.length; index += 2) {
    pages.push({ kind: 'groups', groups: groups.slice(index, index + 2) });
  }

  for (const stage of stages) {
    if ((stage.type === 'KNOCKOUT' || stage.type === 'CONSOLATION') && stage.matches.length > 0) {
      pages.push({ kind: 'bracket', stage });
    }
  }

  return pages;
}

/** Сколько выходит из группы дальше — зона выхода в таблице. */
function advanceOf(config: FormatConfig): number | null {
  return config.type === 'GROUPS_KNOCKOUT' || config.type === 'GROUPS_FINAL_GROUPS'
    ? config.advancePerGroup
    : null;
}

function ScreenPage(): ReactNode {
  const t = useT();
  const locale = useLocale();
  const { publicToken } = Route.useParams();
  const { view, isPending, error, live, retry } = useScreen(publicToken);
  // Часы и подсветка вызова: секундная точность стене не нужна.
  const now = useNow(5_000);
  const [page, setPage] = useState(0);

  const boards = useMemo(() => {
    if (view === undefined) {
      return null;
    }

    // Текущий этап — первый, где осталось что играть.
    const stage =
      view.stages.find((current) =>
        current.matches.some(
          (match) => match.status !== 'FINISHED' && match.status !== 'CANCELLED',
        ),
      ) ?? view.stages.at(-1);

    return {
      tables: buildTables(view.tournament.tableCount, view.stages),
      queue: buildQueue(view.stages),
      played: playedMatches(view.stages),
      progress: progressOf(view.stages),
      names: namesOf(view.players),
      ratings: ratingsOf(view.players),
      pages: pagesOf(view.stages, view.standings.groups),
      stageName: stage?.name ?? null,
    };
  }, [view]);

  const pageCount = boards?.pages.length ?? 0;

  useEffect(() => {
    if (pageCount <= 1) {
      return;
    }

    const timer = setInterval(() => {
      setPage((current) => (current + 1) % pageCount);
    }, PAGE_SECONDS * 1000);

    return () => {
      clearInterval(timer);
    };
  }, [pageCount]);

  // Неизвестный токен — не сбой связи, а неверная ссылка, и висеть на стене
  // с просьбой проверить заполненные поля экран не должен. Отказ приходит
  // только когда состояния нет вовсе: при обрыве связи `view` остаётся, и
  // стена продолжает показывать последнее известное.
  if (isMissingResource(error)) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          px: 3,
          textAlign: 'center',
        }}
      >
        <Typography role="alert" color="text.secondary" sx={{ fontSize: size(2), lineHeight: 1.3 }}>
          {t('screen.notFound')}
        </Typography>
      </Box>
    );
  }

  const current =
    boards === null || pageCount === 0 ? null : (boards.pages[page % pageCount] ?? null);
  const labelOf = (match: MatchView): string =>
    view === undefined ? '' : matchLabel(view.stages, match);
  const percent =
    boards === null || boards.progress.total === 0
      ? 0
      : Math.round((boards.progress.done / boards.progress.total) * 100);

  // Стена занимает экран ровно целиком: телевизор никто не прокручивает, и
  // всё, что уехало за нижний край, для зала не существует.
  return (
    <Box
      sx={{
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        color: 'text.primary',
        px: '1.4vw',
        py: '1.4vh',
      }}
    >
      <QueryState isPending={isPending} error={error} onRetry={retry}>
        {view === undefined || boards === null ? null : (
          <>
            <Box
              component="header"
              sx={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                alignItems: 'center',
                gap: '2vw',
                pb: '1vh',
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: size(2.2),
                    lineHeight: 1.1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {view.tournament.name}
                </Typography>
                <Box sx={{ mt: '0.6vh', display: 'flex', alignItems: 'center', gap: '1vw' }}>
                  {boards.stageName !== null && (
                    <Box
                      component="span"
                      sx={{
                        px: '0.8vw',
                        py: '0.3vh',
                        borderRadius: 999,
                        bgcolor: 'var(--ink-100)',
                        color: 'text.primary',
                        fontSize: size(0.85),
                        fontWeight: 600,
                      }}
                    >
                      {boards.stageName}
                    </Box>
                  )}
                  {/* Прогресс — первое, что спрашивают в зале: «долго ещё?». */}
                  <Box
                    role="progressbar"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    sx={{
                      width: '18vw',
                      height: '0.8vh',
                      borderRadius: 1,
                      bgcolor: 'divider',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{ width: `${String(percent)}%`, height: '100%', bgcolor: 'primary.main' }}
                    />
                  </Box>
                  <Typography
                    component="span"
                    sx={{
                      fontSize: size(0.85),
                      color: 'text.secondary',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {fill(t('screen.progress'), {
                      done: String(boards.progress.done),
                      total: String(boards.progress.total),
                    })}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ textAlign: 'right' }}>
                <Typography
                  component="p"
                  sx={{
                    fontFamily: DISPLAY,
                    fontSize: size(2.6),
                    lineHeight: 1,
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {new Date(now).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                </Typography>
                {/* Метка связи важнее времени обновления: на стене висит
                    последнее известное состояние, и зритель обязан знать, что
                    оно перестало обновляться. */}
                <Typography
                  component="p"
                  sx={{
                    mt: '0.4vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '0.4vw',
                    fontSize: size(0.75),
                    color: live ? 'success.main' : 'warning.main',
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      width: '0.6vw',
                      height: '0.6vw',
                      borderRadius: '50%',
                      bgcolor: live ? 'success.main' : 'warning.main',
                    }}
                  />
                  {live
                    ? t('screen.live')
                    : `${t('screen.offline')} · ${formatDateTime(view.updatedAt, locale)}`}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                mt: '1.4vh',
                flexGrow: 1,
                minHeight: 0,
                display: 'grid',
                gap: '1.4vw',
                gridTemplateColumns: 'minmax(0, 36fr) minmax(0, 64fr)',
              }}
            >
              <Box
                sx={{
                  minHeight: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2vh',
                }}
              >
                <TablesBoard
                  tables={boards.tables}
                  names={boards.names}
                  labelOf={labelOf}
                  now={now}
                />
                <QueueBoard queue={boards.queue} names={boards.names} shown={3} />
                <RecentBoard
                  matches={boards.played}
                  names={boards.names}
                  labelOf={labelOf}
                  shown={3}
                />
              </Box>

              <Box sx={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                {current !== null && (
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Typography component="h2" sx={BOARD_TITLE}>
                      {current.kind === 'bracket'
                        ? t('screen.bracket.title')
                        : t('screen.standings.title')}
                    </Typography>
                    {pageCount > 1 && (
                      <Box sx={{ display: 'flex', gap: '0.4vw' }}>
                        {boards.pages.map((_page, index) => (
                          <Box
                            key={index}
                            sx={{
                              width: '1.6vw',
                              height: '0.5vh',
                              borderRadius: 1,
                              bgcolor: index === page % pageCount ? 'primary.main' : 'divider',
                            }}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                )}

                <Box
                  key={page}
                  sx={{
                    mt: '1vh',
                    flexGrow: 1,
                    minHeight: 0,
                    display: 'grid',
                    gap: '1.4vh',
                    alignContent: current?.kind === 'bracket' ? 'stretch' : 'start',
                    animation: 'kttf-page 400ms ease-out',
                    '@keyframes kttf-page': { from: { opacity: 0 }, to: { opacity: 1 } },
                  }}
                >
                  {current?.kind === 'groups' &&
                    current.groups.map((group) => (
                      <GroupBoard
                        key={`${group.stageId}:${group.groupId ?? 'single'}`}
                        group={group}
                        matches={matchesOf(view.stages, group)}
                        names={boards.names}
                        ratings={boards.ratings}
                        advance={advanceOf(view.tournament.formatConfig)}
                      />
                    ))}
                  {current?.kind === 'bracket' && (
                    <BracketBoard stage={current.stage} names={boards.names} />
                  )}
                </Box>
              </Box>
            </Box>
          </>
        )}
      </QueryState>
    </Box>
  );
}
