import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';
import { z } from 'zod';

import { useT, type MessageKey } from '@/common/i18n';
import { searchPage } from '@/common/search';
import EmptyState from '@/common/ui/empty-state';
import PageHeader from '@/common/ui/page-header';
import Pagination from '@/common/ui/pagination';
import PillTabs from '@/common/ui/pill-tabs';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import Surface from '@/common/ui/surface';
import { useSessionStore } from '@/features/auth/session-store';
import { DUELS_HREF, byTodo, newDuelHref } from '@/features/duels/labels';
import { DuelRows } from '@/features/duels/my-duels';
import { myDuelsQuery } from '@/features/duels/queries';

const PAGE_SIZE = 20;

const searchSchema = z.object({
  /** Активные по умолчанию, `history` — решённые. */
  scope: z.enum(['history']).optional().catch(undefined),
  page: searchPage,
});

export const Route = createFileRoute('/_app/cabinet/duels')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: MyDuelsPage,
});

const SCOPES: readonly (readonly ['active' | 'history', MessageKey])[] = [
  ['active', 'duel.mine.active'],
  ['history', 'duel.mine.past'],
];

/**
 * «Мои дуэли» — `GET /me/duels`: активные (где я автор, вызванный, соперник
 * или откликнулся) и история. Сюда ведёт «Все мои дуэли» из кабинета.
 */
function MyDuelsPage(): ReactNode {
  const t = useT();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const playerId = useSessionStore((state) => state.user?.playerId ?? null);
  const history = search.scope === 'history';
  const page = search.page ?? 1;
  const duels = useQuery({
    ...myDuelsQuery({ scope: history ? 'history' : 'active', page, limit: PAGE_SIZE }),
    enabled: playerId !== null,
  });
  const [now] = useState(() => new Date());
  const pages =
    duels.data === undefined ? 1 : Math.max(1, Math.ceil(duels.data.total / duels.data.limit));

  return (
    <Container maxWidth="md" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <PageHeader
        back={{ href: DUELS_HREF, label: t('page.duels.title') }}
        title={t('duel.mine.title')}
        actions={
          <Button href={newDuelHref()} variant="contained" sx={{ minHeight: 44 }}>
            {t('duel.offer')}
          </Button>
        }
      />

      {playerId === null ? (
        <EmptyState
          title={t('error.api.DUEL_PROFILE_REQUIRED')}
          action={
            <Button href="/settings/profile" sx={{ minHeight: 44 }}>
              {t('duel.gate.profileAction')}
            </Button>
          }
        />
      ) : (
        <>
          <Box sx={{ mb: 2 }}>
            <PillTabs
              label={t('duel.mine.scope')}
              value={history ? 'history' : 'active'}
              options={SCOPES}
              onChange={(next) => {
                void navigate({ search: { scope: next === 'history' ? 'history' : undefined } });
              }}
            />
          </Box>
          <QueryState
            isPending={duels.isPending}
            error={duels.error}
            onRetry={() => void duels.refetch()}
            loading={<RowsSkeleton />}
          >
            {duels.data?.items.length === 0 ? (
              <EmptyState
                title={t(history ? 'duel.mine.emptyHistory' : 'duel.mine.empty')}
                action={
                  <Button href={DUELS_HREF} sx={{ minHeight: 44 }}>
                    {t('duel.mine.find')}
                  </Button>
                }
              />
            ) : (
              <Surface flush>
                <DuelRows
                  duels={
                    history
                      ? (duels.data?.items ?? [])
                      : byTodo(duels.data?.items ?? [], playerId, now)
                  }
                  playerId={playerId}
                  now={now}
                />
              </Surface>
            )}
          </QueryState>
          <Pagination
            page={page}
            pages={pages}
            onPage={(next) => {
              void navigate({
                search: (previous) => ({ ...previous, page: next > 1 ? next : undefined }),
              });
            }}
          />
        </>
      )}
    </Container>
  );
}
