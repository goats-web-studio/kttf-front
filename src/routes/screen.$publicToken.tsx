import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo, type ReactNode } from 'react';

import { isMissingResource } from '@/common/api';
import { formatDateTime, useLocale, useT } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import { buildQueue, buildTables, matchLabel } from '@/features/console/queue';
import { useNow } from '@/features/console/use-now';
import { namesOf, ratingsOf } from '@/features/screen/names';
import QueueBoard from '@/features/screen/queue-board';
import StandingsBoard from '@/features/screen/standings-board';
import { DISPLAY, size } from '@/features/screen/scale';
import TablesBoard from '@/features/screen/tables-board';
import { useScreen } from '@/features/screen/use-screen';
import ThemeRoot from '@/common/ui/theme';

export const Route = createFileRoute('/screen/$publicToken')({
  component: ScreenRoute,
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
/** Экран зала — в ночной теме, как и консоль (раздел 3.3). */
function ScreenRoute(): ReactNode {
  return (
    <ThemeRoot theme="night">
      <ScreenPage />
    </ThemeRoot>
  );
}

function ScreenPage(): ReactNode {
  const t = useT();
  const locale = useLocale();
  const { publicToken } = Route.useParams();
  const { view, isPending, error, live, retry } = useScreen(publicToken);
  // Часы и подсветка вызова: секундная точность стене не нужна.
  const now = useNow(5_000);

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

  const hasGroups = (view?.standings.groups.length ?? 0) > 0;

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
        px: '1.6vw',
        py: '1.6vh',
      }}
    >
      <QueryState isPending={isPending} error={error} onRetry={retry}>
        {view === undefined || boards === null ? null : (
          <>
            <Box
              component="header"
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '2vw',
                pb: '1.2vh',
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="h1"
                sx={{
                  fontSize: size(2.4),
                  lineHeight: 1.1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {view.tournament.name}
              </Typography>

              <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                <Typography
                  component="p"
                  sx={{
                    fontFamily: DISPLAY,
                    fontSize: size(2.4),
                    lineHeight: 1.1,
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
                  color={live ? 'text.secondary' : 'warning.main'}
                  sx={{ fontSize: size(0.8), lineHeight: 1.3 }}
                >
                  {live
                    ? formatDateTime(view.updatedAt, locale)
                    : `${t('screen.offline')} · ${formatDateTime(view.updatedAt, locale)}`}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                mt: '1.6vh',
                flexGrow: 1,
                minHeight: 0,
                display: 'grid',
                gap: '1.6vw',
                gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 30vw)',
              }}
            >
              <TablesBoard
                tables={boards.tables}
                names={boards.names}
                labelOf={(match) => matchLabel(view.stages, match)}
                now={now}
              />

              <Box
                sx={{
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2.4vh',
                  overflow: 'hidden',
                }}
              >
                <QueueBoard queue={boards.queue} names={boards.names} shown={hasGroups ? 4 : 10} />
                <StandingsBoard
                  groups={view.standings.groups}
                  names={boards.names}
                  ratings={boards.ratings}
                />
              </Box>
            </Box>
          </>
        )}
      </QueryState>
    </Box>
  );
}
