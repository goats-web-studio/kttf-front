import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import { useMatchRoute, useNavigate } from '@tanstack/react-router';
import { useId, useState, type ReactNode } from 'react';

import { useT } from '@/common/i18n';
import RouterLink from '@/common/ui/router-link';
import { signOut } from '@/features/auth/session';
import { useSessionStore } from '@/features/auth/session-store';

import { SECTIONS } from './sections';

/**
 * Шапка сайта.
 *
 * Липкая — docs/07-design-system.md, 6.1: в длинном рейтинге и таблицах
 * группы путь к разделам не должен уезжать вверх.
 *
 * Разделы на телефоне уходят в нижнюю панель (раздел 4 дизайн-системы), здесь
 * остаются знак и вход: четыре слова и логотип в 360px не помещаются.
 */
export default function SiteHeader(): ReactNode {
  const t = useT();
  const user = useSessionStore((state) => state.user);

  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 'appBar',
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Container maxWidth="lg">
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minHeight: 56 }}>
          {/* Знак, а не набранное слово: у логотипа свои пропорции и
              наклон 9°, повторить их шрифтом нельзя. */}
          <Link href="/" sx={{ display: 'flex', mr: 2, flexShrink: 0 }}>
            <img src="/logo-wordmark.png" alt={t('app.logo')} style={{ height: 20, width: 'auto' }} />
          </Link>
          <Stack
            component="nav"
            direction="row"
            spacing={1}
            aria-label={t('nav.sections')}
            sx={{ display: { xs: 'none', sm: 'flex' } }}
          >
            {SECTIONS.map((section) => (
              <NavButton key={section.to} to={section.to}>
                {t(section.label)}
              </NavButton>
            ))}
          </Stack>
          <Box sx={{ flexGrow: 1 }} />
          {user === null ? <NavButton to="/login">{t('page.login.title')}</NavButton> : <AccountMenu />}
        </Stack>
      </Container>
    </Box>
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

/**
 * Кабинет вошедшего: профиль, клубы, выход.
 *
 * Меню, а не три кнопки в ряд: на телефоне шапке и так тесно, а клубы есть
 * не у каждого. Выход ведёт на главную — оставаться на странице кабинета,
 * которую уже не открыть, бессмысленно.
 */
function AccountMenu(): ReactNode {
  const t = useT();
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const menuId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const active = matchRoute({ to: '/cabinet', fuzzy: true }) !== false;

  const close = (): void => {
    setAnchor(null);
  };

  return (
    <>
      <Button
        variant="text"
        color={active ? 'primary' : 'secondary'}
        aria-haspopup="menu"
        aria-expanded={anchor !== null}
        aria-controls={anchor === null ? undefined : menuId}
        onClick={(event) => {
          setAnchor(event.currentTarget);
        }}
        sx={{ minHeight: 44, fontWeight: active ? 600 : 500 }}
      >
        {t('page.cabinet.title')}
      </Button>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={anchor !== null}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem component={RouterLink} href="/cabinet" onClick={close} sx={{ minHeight: 44 }}>
          {t('nav.profile')}
        </MenuItem>
        <MenuItem
          component={RouterLink}
          href="/cabinet/clubs"
          onClick={close}
          sx={{ minHeight: 44 }}
        >
          {t('nav.myClubs')}
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            close();
            void signOut().then(() => navigate({ to: '/' }));
          }}
          sx={{ minHeight: 44 }}
        >
          {t('login.signOut')}
        </MenuItem>
      </Menu>
    </>
  );
}
