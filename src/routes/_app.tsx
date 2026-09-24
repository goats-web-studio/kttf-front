import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import ThemeRoot from '@/common/ui/theme';
import { signOut } from '@/features/auth/session';

export const Route = createFileRoute('/_app')({
  /**
   * Охрана кабинета в одной точке, а не на каждой странице.
   *
   * Забыть проверку на отдельной странице легко, и тогда она молча
   * открывается всем. Здесь же это не защита данных: по ТС 8.3 права
   * проверяет бэкенд guard'ами, интерфейс только не показывает того,
   * чего человек всё равно не получит.
   */
  beforeLoad: ({ context, location }) => {
    if (context.session === null) {
      // Адрес запоминается: человек, открывший ссылку на кабинет, обязан
      // попасть именно туда после входа, а не на главную.
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
  },
  component: AppLayout,
});

function AppLayout(): ReactNode {
  const t = useT();

  return (
    <ThemeRoot>
      <Box
        sx={{
          display: 'flex',
          minHeight: '100%',
          flexDirection: 'column',
          bgcolor: 'var(--paper-sunken)',
        }}
      >
        <Box
          component="header"
          sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
        >
          <Container maxWidth="md" component="nav">
            <Stack direction="row" sx={{ alignItems: 'center', minHeight: 56 }}>
              <Link href="/" sx={{ display: 'flex', flexShrink: 0 }}>
                <img
                  src="/logo-wordmark.png"
                  alt={t('app.logo')}
                  style={{ height: 20, width: 'auto' }}
                />
              </Link>
              <Box sx={{ flexGrow: 1 }} />
              <Button
                variant="text"
                onClick={() => {
                  void signOut();
                }}
              >
                {t('login.signOut')}
              </Button>
            </Stack>
          </Container>
        </Box>
        <Box component="main" sx={{ flexGrow: 1 }}>
          <Outlet />
        </Box>
      </Box>
    </ThemeRoot>
  );
}
