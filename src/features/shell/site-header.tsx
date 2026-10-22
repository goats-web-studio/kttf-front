import type { AuthUserView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import { useQuery } from '@tanstack/react-query';
import { useMatchRoute, useNavigate } from '@tanstack/react-router';
import { useId, useState, type ReactNode } from 'react';

import { useT } from '@/common/i18n';
import PlayerAvatar from '@/common/ui/player-avatar';
import RatingValue from '@/common/ui/rating-value';
import RouterLink from '@/common/ui/router-link';
import { signOut } from '@/features/auth/session';
import { useSessionStore } from '@/features/auth/session-store';
import NotificationsBell from '@/features/notifications/bell';
import { playerQuery } from '@/features/players/queries';

import NavDropdown from './nav-dropdown';
import { SECTIONS } from './sections';

/**
 * Шапка сайта.
 *
 * Липкая — docs/07-design-system.md, 6.1: в длинном рейтинге и таблицах
 * группы путь к разделам не должен уезжать вверх.
 *
 * Разделы на телефоне уходят в нижнюю панель (раздел 4 дизайн-системы), здесь
 * остаются знак и вход: четыре слова и логотип в 360px не помещаются.
 * Вошедшему — колокольчик уведомлений и аватарка (ADR-059, T3).
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
            <img
              src="/logo-wordmark.png"
              alt={t('app.logo')}
              style={{ height: 20, width: 'auto' }}
            />
          </Link>
          <Stack
            component="nav"
            direction="row"
            spacing={1}
            aria-label={t('nav.sections')}
            sx={{ display: { xs: 'none', sm: 'flex' } }}
          >
            {/* У каждого раздела — меню быстрых переходов (nav-menus.ts). */}
            {SECTIONS.map((section) => (
              <NavDropdown key={section.to} to={section.to} label={t(section.label)} />
            ))}
          </Stack>
          <Box sx={{ flexGrow: 1 }} />
          {user === null ? (
            <NavButton to="/login">{t('page.login.title')}</NavButton>
          ) : (
            <>
              {/* Колокольчик — рядом с аватаркой и на телефоне (T3). */}
              <NotificationsBell />
              <AccountMenu user={user} />
            </>
          )}
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
 * Вошедший: аватарка, имя и рейтинг вместо слова «Кабинет» — ADR-048.
 *
 * Человек узнаёт себя в шапке и видит свой рейтинг с любой страницы, как
 * в RTTF. Имя и фото приходят тем же запросом, что открывает профиль, —
 * кэш общий, второго запроса на страницу профиля нет.
 *
 * Меню, а не кнопки в ряд: на телефоне шапке тесно, и там остаётся одна
 * аватарка. «Мой профиль» ведёт на публичную страницу — себя смотрят так
 * же, как других; «Кабинет» — рабочий стол, «Настройки» — анкета и
 * аккаунт. «Мои клубы» и администрирование — только тем, у кого они есть.
 */
function AccountMenu({ user }: { readonly user: AuthUserView }): ReactNode {
  const t = useT();
  const navigate = useNavigate();
  const menuId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const player = useQuery({
    ...playerQuery(user.playerId ?? ''),
    enabled: user.playerId !== null,
  }).data;

  const close = (): void => {
    setAnchor(null);
  };

  const item = { onClick: close, sx: { minHeight: 44 } } as const;

  return (
    <>
      <ButtonBase
        aria-haspopup="menu"
        aria-expanded={anchor !== null}
        aria-controls={anchor === null ? undefined : menuId}
        aria-label={t('nav.account')}
        onClick={(event) => {
          setAnchor(event.currentTarget);
        }}
        sx={{
          minHeight: 44,
          pl: 0.5,
          pr: { xs: 0.5, md: 1.5 },
          gap: 1.25,
          borderRadius: 999,
          transition: 'background-color var(--dur-fast) var(--ease)',
          '@media (hover: hover)': { '&:hover': { bgcolor: 'var(--paper-hover)' } },
          '&.Mui-focusVisible': { outline: '2px solid var(--red-600)', outlineOffset: '2px' },
        }}
      >
        {player === undefined ? (
          <Box component="span" sx={{ px: 1, typography: 'body2', fontWeight: 600 }}>
            {user.login ?? t('nav.account')}
          </Box>
        ) : (
          <>
            <PlayerAvatar
              lastName={player.lastName}
              firstName={player.firstName}
              photoUrl={player.photoUrl}
              size="md"
            />
            {/* Имя и рейтинг — с 900px: на телефоне шапке хватает аватарки, а на
                планшете рядом стоят четыре раздела (ADR-058). */}
            <Box
              component="span"
              sx={{
                display: { xs: 'none', md: 'flex' },
                flexDirection: 'column',
                alignItems: 'flex-start',
                lineHeight: 1.2,
                textAlign: 'left',
              }}
            >
              <Box component="span" sx={{ typography: 'body2', fontWeight: 600 }}>
                {player.lastName} {player.firstName}
              </Box>
              <Box
                component="span"
                sx={{
                  typography: 'caption',
                  color: 'text.secondary',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {t('nav.ratings')} <RatingValue value={player.rating} animate={false} />
              </Box>
            </Box>
          </>
        )}
      </ButtonBase>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={anchor !== null}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {user.playerId === null ? (
          <MenuItem component={RouterLink} href="/settings/profile" {...item}>
            {t('nav.createProfile')}
          </MenuItem>
        ) : (
          <MenuItem component={RouterLink} href={`/players/${user.playerId}`} {...item}>
            {t('nav.myProfile')}
          </MenuItem>
        )}
        <MenuItem component={RouterLink} href="/cabinet" {...item}>
          {t('page.cabinet.title')}
        </MenuItem>
        {user.clubRoles.length > 0 && (
          <MenuItem component={RouterLink} href="/cabinet/clubs" {...item}>
            {t('nav.myClubs')}
          </MenuItem>
        )}
        {user.isAdmin && (
          <MenuItem component={RouterLink} href="/cabinet/applications" {...item}>
            {t('nav.admin')}
          </MenuItem>
        )}
        <MenuItem component={RouterLink} href="/settings" {...item}>
          {t('nav.settings')}
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
