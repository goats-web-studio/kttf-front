import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { createFileRoute, Outlet, useMatchRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import ThemeRoot from '@/common/ui/theme';
import { useSessionStore } from '@/features/auth/session-store';

export const Route = createFileRoute('/_public')({
  component: PublicLayout,
});

/**
 * Оболочка публичной части: рейтинги, календарь, профили, результаты (ТЗ 9).
 *
 * Открыта без авторизации целиком — критерий готовности MVP требует, чтобы
 * страница результатов открывалась без входа.
 */
function PublicLayout(): ReactNode {
  const t = useT();
  const user = useSessionStore((state) => state.user);

  return (
    <ThemeRoot>
      <Box
        sx={{
          display: 'flex',
          minHeight: '100%',
          flexDirection: 'column',
          bgcolor: 'background.paper',
        }}
      >
        <Box component="header" sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Container maxWidth="md" component="nav">
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minHeight: 56 }}>
              {/* Знак, а не набранное слово: у логотипа свои пропорции и
                  наклон 9°, повторить их шрифтом нельзя. */}
              <Link href="/" sx={{ display: 'flex', mr: 2, flexShrink: 0 }}>
                <img
                  src="/logo-wordmark.png"
                  alt={t('app.logo')}
                  style={{ height: 20, width: 'auto' }}
                />
              </Link>
              <NavButton to="/ratings">{t('nav.ratings')}</NavButton>
              <NavButton to="/tournaments">{t('nav.tournaments')}</NavButton>
              <Box sx={{ flexGrow: 1 }} />
              {user === null ? (
                <NavButton to="/login">{t('page.login.title')}</NavButton>
              ) : (
                <NavButton to="/cabinet">{t('page.cabinet.title')}</NavButton>
              )}
            </Stack>
          </Container>
        </Box>
        <Box component="main" sx={{ flexGrow: 1 }}>
          <Outlet />
        </Box>
        <Box
          component="footer"
          sx={{ borderTop: 1, borderColor: 'divider', px: 2, py: 3, textAlign: 'center' }}
        >
          <Typography variant="body2" color="text.secondary">
            {t('app.tagline')}
          </Typography>
          {/* Инстаграм — единственный внешний канал федерации: турниры
              объявляются там, и игрок ищет их сначала в нём. */}
          <Link
            href="https://www.instagram.com/kttf.kz"
            target="_blank"
            rel="noreferrer"
            variant="body2"
            sx={{ display: 'inline-block', mt: 1 }}
          >
            {t('footer.instagram')}
          </Link>
        </Box>
      </Box>
    </ThemeRoot>
  );
}

/** Пункт шапки. Текущий раздел отмечен и цветом, и `aria-current`. */
function NavButton({
  to,
  children,
}: {
  readonly to: string;
  readonly children: ReactNode;
}): ReactNode {
  const matchRoute = useMatchRoute();
  const active = matchRoute({ to, fuzzy: true }) !== false;

  return (
    <Button
      variant="text"
      color={active ? 'primary' : 'secondary'}
      href={to}
      aria-current={active ? 'page' : undefined}
      sx={{ minHeight: 44, fontWeight: active ? 600 : 500 }}
    >
      {children}
    </Button>
  );
}
