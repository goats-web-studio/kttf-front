import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import RouterLink from '@/common/ui/router-link';
import { RowsSkeleton } from '@/common/ui/skeleton';

import NotificationList from './notification-list';
import { notificationsQuery, unreadNotificationsQuery } from './queries';
import { useReadNotifications } from './read';

/** Сколько последних уведомлений в окне колокольчика; остальные — на странице. */
const LATEST = 8;

const BELL_SX = {
  width: 44,
  height: 44,
  color: 'text.secondary',
  '&.Mui-focusVisible': { outline: '2px solid var(--red-600)', outlineOffset: '2px' },
} as const;

/**
 * Колокольчик в шапке — ТЗ 10, первая часть (ADR-059, T3): число
 * непрочитанных, по нажатию — последние уведомления и «Все уведомления».
 * На телефоне окно над шапкой тесное — колокольчик ведёт сразу на страницу.
 */
export default function NotificationsBell(): ReactNode {
  const t = useT();
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  const popoverId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const count = useQuery(unreadNotificationsQuery).data?.unread;
  const unread = typeof count === 'number' ? count : 0;
  const label =
    unread > 0
      ? fill(t('notifications.bellUnread'), { count: String(unread) })
      : t('notifications.bell');
  const icon = (
    <Badge
      badgeContent={unread}
      max={99}
      color="primary"
      data-notifications-unread={unread}
      sx={{ '& .MuiBadge-badge': { fontVariantNumeric: 'tabular-nums' } }}
    >
      <Bell size={20} aria-hidden />
    </Badge>
  );

  if (phone) {
    return (
      <IconButton component={RouterLink} href="/notifications" aria-label={label} sx={BELL_SX}>
        {icon}
      </IconButton>
    );
  }

  const close = (): void => {
    setAnchor(null);
  };

  return (
    <>
      <IconButton
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={anchor !== null}
        aria-controls={anchor === null ? undefined : popoverId}
        onClick={(event) => {
          setAnchor(event.currentTarget);
        }}
        sx={BELL_SX}
      >
        {icon}
      </IconButton>
      <Popover
        id={popoverId}
        open={anchor !== null}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 380, maxWidth: 'calc(100vw - 32px)' } } }}
      >
        {anchor !== null && <Latest unread={unread} onClose={close} />}
      </Popover>
    </>
  );
}

function Latest({
  unread,
  onClose,
}: {
  readonly unread: number;
  readonly onClose: () => void;
}): ReactNode {
  const t = useT();
  const titleId = useId();
  const latest = useQuery(notificationsQuery({ page: 1, limit: LATEST }));
  const read = useReadNotifications();
  const items = latest.data?.items ?? [];

  return (
    <Box role="dialog" aria-labelledby={titleId} data-notifications-popover>
      <Box
        sx={{
          px: 2,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography id={titleId} variant="h3" component="h2">
          {t('notifications.title')}
        </Typography>
        {unread > 0 && (
          <Button
            variant="text"
            size="small"
            disabled={read.isPending}
            onClick={() => {
              read.mutate(undefined);
            }}
            sx={{ minHeight: 44 }}
          >
            {t('notifications.readAll')}
          </Button>
        )}
      </Box>
      <Box sx={{ maxHeight: 420, overflowY: 'auto' }}>
        <QueryState
          isPending={latest.isPending}
          error={latest.error}
          onRetry={() => void latest.refetch()}
          loading={
            <Box sx={{ p: 2 }}>
              <RowsSkeleton rows={3} />
            </Box>
          }
        >
          {items.length === 0 ? (
            <Typography color="text.secondary" sx={{ px: 2, py: 3, textAlign: 'center' }}>
              {t('notifications.empty')}
            </Typography>
          ) : (
            <NotificationList items={items} onOpen={onClose} dense />
          )}
        </QueryState>
      </Box>
      <Box sx={{ borderTop: 1, borderColor: 'divider', p: 1 }}>
        <Button
          variant="text"
          fullWidth
          href="/notifications"
          onClick={onClose}
          sx={{ minHeight: 44 }}
        >
          {t('notifications.all')}
        </Button>
      </Box>
    </Box>
  );
}
