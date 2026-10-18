import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import Surface from '@/common/ui/surface';
import AccountForm from '@/features/auth/account-form';
import PasswordForm from '@/features/auth/password-form';
import { useSessionStore } from '@/features/auth/session-store';
import SettingsLayout from '@/features/settings/settings-layout';

export const Route = createFileRoute('/_app/settings/account')({
  component: AccountSettingsPage,
});

/**
 * Настройки аккаунта — ТЗ 2.1, ADR-034, ADR-048.
 *
 * Чем человек входит и как с ним связаться — и ничего о нём как об игроке.
 * Телефон показан, но не правится: смена номера — задача поддержки (ТЗ 2.1).
 */
function AccountSettingsPage(): ReactNode {
  const t = useT();
  const user = useSessionStore((state) => state.user);

  return (
    <SettingsLayout section="account" lead={t('cabinet.account.lead')}>
      {user !== null && (
        <>
          <Surface title={t('settings.account.signIn')}>
            <Box
              component="dl"
              sx={{
                m: 0,
                display: 'grid',
                columnGap: 2,
                gridTemplateColumns: 'max-content 1fr',
                '& dd': { m: 0 },
              }}
            >
              <Typography component="dt" variant="body2" color="text.secondary">
                {t('cabinet.account.phone')}
              </Typography>
              <Typography component="dd" variant="body2">
                {user.phone}
                <Typography
                  component="span"
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 1 }}
                >
                  {t('cabinet.account.phoneFixed')}
                </Typography>
              </Typography>
            </Box>
            <AccountForm user={user} />
          </Surface>

          <Surface title={t('account.password.title')}>
            <PasswordForm />
          </Surface>
        </>
      )}
    </SettingsLayout>
  );
}
