import type { NotificationView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { formatDateTime, useLocale, useT } from '@/common/i18n';
import RouterLink from '@/common/ui/router-link';
import { VISUALLY_HIDDEN } from '@/common/ui/visually-hidden';

import { notificationCaption, notificationHref, notificationText } from './model';
import { useReadNotifications } from './read';

/**
 * Уведомления строками — в окне колокольчика и на странице уведомлений.
 * Строка — ссылка туда, где с событием что-то делают; нажатие заодно
 * отмечает её прочитанной. Непрочитанная — на подложке, жирнее и с точкой.
 */
export default function NotificationList({
  items,
  onOpen,
  dense = false,
}: {
  readonly items: readonly NotificationView[];
  /** После перехода по строке — например, закрыть окно колокольчика. */
  readonly onOpen?: () => void;
  readonly dense?: boolean;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const read = useReadNotifications();

  return (
    <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
      {items.map((notification) => {
        const unread = notification.readAt === null;
        const caption = notificationCaption(notification, t);

        return (
          <Box
            component="li"
            key={notification.id}
            sx={{ borderTop: 1, borderColor: 'divider', '&:first-of-type': { borderTop: 0 } }}
          >
            <ButtonBase
              component={RouterLink}
              href={notificationHref(notification)}
              data-notification={notification.id}
              data-unread={unread ? 'true' : undefined}
              onClick={() => {
                if (unread) read.mutate([notification.id]);
                onOpen?.();
              }}
              sx={{
                width: '100%',
                minHeight: 56,
                px: dense ? 2 : { xs: 2, sm: 3 },
                py: 1.5,
                display: 'grid',
                gridTemplateColumns: '8px minmax(0, 1fr)',
                columnGap: 1.5,
                alignItems: 'start',
                textAlign: 'left',
                bgcolor: unread ? 'var(--paper-sunken)' : 'transparent',
                transition: 'background-color var(--dur-fast) var(--ease)',
                '@media (hover: hover)': { '&:hover': { bgcolor: 'var(--paper-hover)' } },
                '&.Mui-focusVisible': {
                  outline: '2px solid var(--red-600)',
                  outlineOffset: '-2px',
                },
              }}
            >
              <Box
                component="span"
                aria-hidden
                sx={{
                  mt: 1,
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  bgcolor: unread ? 'var(--red-600)' : 'transparent',
                }}
              />
              <Box component="span" sx={{ minWidth: 0 }}>
                {unread && (
                  <Box component="span" sx={VISUALLY_HIDDEN}>
                    {`${t('notifications.unread')}: `}
                  </Box>
                )}
                <Typography
                  component="span"
                  sx={{
                    display: 'block',
                    fontWeight: unread ? 600 : 400,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {notificationText(notification, t)}
                </Typography>
                <Typography
                  component="span"
                  variant="body2"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 0.25 }}
                >
                  {caption === null
                    ? formatDateTime(notification.createdAt, locale)
                    : `${caption} · ${formatDateTime(notification.createdAt, locale)}`}
                </Typography>
              </Box>
            </ButtonBase>
          </Box>
        );
      })}
    </Box>
  );
}
