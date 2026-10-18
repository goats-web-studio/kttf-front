import { DEFAULT_PAGE_SIZE } from '@kttf/shared/types';
import { queryOptions, useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import CardActionArea from '@mui/material/CardActionArea';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { createFileRoute } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
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

function ConsolePage(): ReactNode {
  const t = useT();
  const locale = useLocale();
  const running = useQuery(runningQuery);

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
            <Typography color="text.secondary">{t('console.pick.empty')}</Typography>
          ) : (
            <Stack component="ul" spacing={1} sx={{ m: 0, p: 0, listStyle: 'none' }}>
              {running.data.items.map((tournament) => (
                <Paper key={tournament.id} component="li" variant="outlined">
                  {/* `href` уходит в роутер через `LinkComponent` темы. */}
                  <CardActionArea
                    href={`/console/${tournament.id}`}
                    sx={{
                      p: 2.5,
                      minHeight: 72,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      borderRadius: 4,
                    }}
                  >
                    {/* Идёт сейчас — красная точка: единственный цвет в списке. */}
                    <Box
                      aria-hidden
                      sx={{
                        width: 10,
                        height: 10,
                        flexShrink: 0,
                        borderRadius: '50%',
                        bgcolor: 'var(--night-red)',
                        boxShadow:
                          '0 0 0 4px color-mix(in srgb, var(--night-red) 20%, transparent)',
                      }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        component="span"
                        sx={{ display: 'block', fontWeight: 700, fontSize: 17 }}
                      >
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
                    </Box>
                    <ChevronRight size={22} aria-hidden />
                  </CardActionArea>
                </Paper>
              ))}
            </Stack>
          )}
        </QueryState>
      </Box>
    </Box>
  );
}
