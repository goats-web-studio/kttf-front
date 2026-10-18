import { DEFAULT_PAGE_SIZE, type TournamentView } from '@kttf/shared/types';
import { queryOptions, useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CardActionArea from '@mui/material/CardActionArea';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { createFileRoute } from '@tanstack/react-router';
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

/** Сколько дней завершённый турнир остаётся под рукой у судьи. */
const RECENT_DAYS = 3;

/** Сколько завершённых показывать: список — подсказка, а не архив. */
const RECENT_SHOWN = 5;

/**
 * Недавно завершённые — сюда судья возвращается за итогами и ссылкой на них.
 *
 * Без них список пустел в ту же секунду, как судья закрывал турнир, и страница
 * выглядела сломанной. Ведут на публичные итоги: в консоли закрытого турнира
 * делать уже нечего.
 */
const finishedQuery = queryOptions({
  queryKey: consoleKeys.finished,
  queryFn: async () => {
    const from = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const page = await listTournaments({
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
      status: 'RATED',
      from,
    });

    // Сервер отдаёт по дате старта от ранних; свежий итог нужен первым.
    return [...page.items].reverse().slice(0, RECENT_SHOWN);
  },
  staleTime: 30_000,
});

function ConsolePage(): ReactNode {
  const t = useT();
  const running = useQuery(runningQuery);
  const finished = useQuery(finishedQuery);

  return (
    <Box component="section" sx={{ mx: 'auto', width: '100%', maxWidth: 768, px: 2, py: 5 }}>
      <Typography variant="h1">{t('page.console.title')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {t('console.pick.lead')}
      </Typography>

      <Box sx={{ mt: 3 }}>
        <QueryState
          isPending={running.isPending}
          error={running.error}
          onRetry={() => void running.refetch()}
        >
          {running.data === undefined ? null : running.data.items.length === 0 ? (
            // Пустой список — не тупик: турнир попадает сюда после старта,
            // а стартуют его со страницы турнира в кабинете клуба.
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography sx={{ fontWeight: 600 }}>{t('console.pick.empty')}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {t('console.pick.emptyHint')}
              </Typography>
              <Button variant="outlined" href="/cabinet/clubs" sx={{ mt: 2, minHeight: 44 }}>
                {t('nav.myClubs')}
              </Button>
            </Paper>
          ) : (
            <TournamentList
              tournaments={running.data.items}
              hrefOf={(tournament) => `/console/${tournament.id}`}
            />
          )}
        </QueryState>
      </Box>

      {finished.data !== undefined && finished.data.length > 0 && (
        <Box component="section" sx={{ mt: 5 }}>
          <Typography component="h2" variant="h3" sx={{ mb: 1.5 }}>
            {t('console.pick.finished')}
          </Typography>
          <TournamentList
            tournaments={finished.data}
            hrefOf={(tournament) => `/tournaments/${tournament.id}`}
          />
        </Box>
      )}
    </Box>
  );
}

function TournamentList({
  tournaments,
  hrefOf,
}: {
  readonly tournaments: readonly TournamentView[];
  readonly hrefOf: (tournament: TournamentView) => string;
}): ReactNode {
  const locale = useLocale();

  return (
    <Stack component="ul" spacing={1} sx={{ m: 0, p: 0, listStyle: 'none' }}>
      {tournaments.map((tournament) => (
        <Paper key={tournament.id} component="li" variant="outlined">
          {/* `href` уходит в роутер через `LinkComponent` темы. */}
          <CardActionArea href={hrefOf(tournament)} sx={{ p: 2, minHeight: 56 }}>
            <Typography component="span" sx={{ display: 'block', fontWeight: 600 }}>
              {tournament.name}
            </Typography>
            <Typography
              component="span"
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5, display: 'block' }}
            >
              {formatDateTime(tournament.startsAt, locale)}
            </Typography>
          </CardActionArea>
        </Paper>
      ))}
    </Stack>
  );
}
