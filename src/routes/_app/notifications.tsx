import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { CheckCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { z } from 'zod';

import { useT } from '@/common/i18n';
import EmptyState from '@/common/ui/empty-state';
import { BackLink } from '@/common/ui/page-header';
import Pagination from '@/common/ui/pagination';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import Surface from '@/common/ui/surface';
import NotificationList from '@/features/notifications/notification-list';
import { notificationsQuery, unreadNotificationsQuery } from '@/features/notifications/queries';
import { useReadNotifications } from '@/features/notifications/read';

const PAGE_SIZE = 20;

/** Страница — в адресе: «Назад» со ссылки из уведомления вернёт на неё же. */
const searchSchema = z.object({
  page: z.coerce.number().int().positive().optional().catch(undefined),
});

export const Route = createFileRoute('/_app/notifications')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: NotificationsPage,
});

/**
 * Уведомления — ТЗ 10, первая часть (ADR-059, T3). Все уведомления
 * постранично, новые первыми; хранятся `NOTIFICATIONS_KEEP_DAYS`. Строка
 * ведёт туда, где с событием что-то делают, и отмечается прочитанной.
 */
function NotificationsPage(): ReactNode {
  const t = useT();
  const navigate = Route.useNavigate();
  const page = Route.useSearch().page ?? 1;
  const list = useQuery(notificationsQuery({ page, limit: PAGE_SIZE }));
  const unread = useQuery(unreadNotificationsQuery).data?.unread ?? 0;
  const read = useReadNotifications();
  const items = list.data?.items ?? [];

  return (
    <Container maxWidth="md" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <BackLink href="/cabinet" label={t('page.cabinet.title')} />
      <Stack
        direction="row"
        useFlexGap
        spacing={2}
        sx={{ mt: 1, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
      >
        <Typography variant="h1">{t('notifications.title')}</Typography>
        {unread > 0 && (
          <Button
            variant="text"
            startIcon={<CheckCheck size={16} aria-hidden />}
            disabled={read.isPending}
            onClick={() => {
              read.mutate(undefined);
            }}
            sx={{ minHeight: 44 }}
          >
            {t('notifications.readAll')}
          </Button>
        )}
      </Stack>

      <Box sx={{ mt: 3 }}>
        <QueryState
          isPending={list.isPending}
          error={list.error}
          onRetry={() => void list.refetch()}
          loading={<RowsSkeleton rows={5} />}
        >
          {items.length === 0 ? (
            <EmptyState title={t('notifications.empty')} text={t('notifications.emptyText')} />
          ) : (
            <Surface flush>
              <NotificationList items={items} />
            </Surface>
          )}
          <Pagination
            page={page}
            pages={Math.ceil((list.data?.total ?? 0) / PAGE_SIZE)}
            onPage={(next) => {
              void navigate({ search: { page: next === 1 ? undefined : next } });
            }}
          />
        </QueryState>
      </Box>
    </Container>
  );
}
