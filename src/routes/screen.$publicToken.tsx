import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo, type ReactNode } from 'react';

import { isMissingResource } from '@/common/api';
import { formatDateTime, useLocale, useT } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import { buildQueue, buildTables } from '@/features/console/queue';
import { namesOf, ratingsOf } from '@/features/screen/names';
import QueueBoard from '@/features/screen/queue-board';
import StandingsBoard from '@/features/screen/standings-board';
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
          minHeight: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          px: 3,
          textAlign: 'center',
        }}
      >
        <Typography role="alert" color="text.secondary" sx={{ fontSize: 30, lineHeight: '36px' }}>
          {t('screen.notFound')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100%',
        bgcolor: 'background.default',
        color: 'text.primary',
        px: 3,
        py: 2.5,
      }}
    >
      <QueryState isPending={isPending} error={error} onRetry={retry}>
        {view === undefined || boards === null ? null : (
          <>
            <Box
              component="header"
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 3,
                pb: 1.5,
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <Typography variant="h1" sx={{ fontSize: 44, lineHeight: '44px' }}>
                {view.tournament.name}
              </Typography>

              <Typography color="text.secondary" sx={{ fontSize: 17, lineHeight: '26px' }}>
                {/* Метка связи важнее времени: на стене висит последнее
                    известное состояние, и зритель обязан знать, что оно
                    перестало обновляться. */}
                {live ? (
                  formatDateTime(view.updatedAt, locale)
                ) : (
                  <Box component="span" sx={{ color: 'warning.main' }}>
                    {t('screen.offline')} · {formatDateTime(view.updatedAt, locale)}
                  </Box>
                )}
              </Typography>
            </Box>

            <Box
              sx={{
                mt: 2.5,
                display: 'grid',
                gap: 4,
                gridTemplateColumns: { xs: '1fr', xl: '2fr 1fr' },
              }}
            >
              <TablesBoard tables={boards.tables} names={boards.names} />
              <QueueBoard queue={boards.queue} names={boards.names} />
            </Box>

            <Box sx={{ mt: 4 }}>
              <StandingsBoard
                groups={view.standings.groups}
                names={boards.names}
                ratings={boards.ratings}
              />
            </Box>
          </>
        )}
      </QueryState>
    </Box>
  );
}
