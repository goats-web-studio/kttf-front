import type { AuthUserView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Collapse from '@mui/material/Collapse';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from '@tanstack/react-router';
import {
  Bell,
  BookOpen,
  Building2,
  ChevronDown,
  Flag,
  LayoutDashboard,
  MapPinned,
  Megaphone,
  MessagesSquare,
  Plus,
  Settings,
  ShieldCheck,
  Swords,
  User,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { useT, type MessageKey } from '@/common/i18n';
import RouterLink from '@/common/ui/router-link';
import { useSessionStore } from '@/features/auth/session-store';
import { newClubApplicationsCountQuery } from '@/features/club-applications/queries';
import { pendingCoachesCountQuery } from '@/features/coaches/queries';
import { adminDuelsQuery } from '@/features/duels/queries';
import { forumReportsQuery } from '@/features/forum/queries';
import { unreadNotificationsQuery } from '@/features/notifications/queries';

import { useMyClubs } from './my-clubs';

interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: LucideIcon;
  /** Число ждущих — красной меткой: видно, где работа, не открывая раздел. */
  readonly count?: number;
  /** Пометка серым справа: «скрыт», «судья». */
  readonly note?: string;
  /** Активен и на вложенных адресах — клуб с вкладками. */
  readonly prefix?: boolean;
}

interface NavGroup {
  readonly title: MessageKey | null;
  readonly items: readonly NavItem[];
}

/**
 * Кабинет с боковым меню — ADR-074.
 *
 * Раньше кабинет был лентой блоков: клубы плитками, турниры, рейтинг, дуэли,
 * заявки, тренер, администрирование кнопками — до нужного листали и искали
 * глазами. Теперь разделы слева, сгруппированные по ролям, с числом ждущих
 * дел; справа — сам раздел. Меню одно на кабинет и настройки.
 *
 * На телефоне меню сворачивается в строку «Разделы кабинета» над разделом:
 * сайдбар шириной в экран закрывал бы то, ради чего пришли.
 */
export default function CabinetShell({ children }: { readonly children: ReactNode }): ReactNode {
  const user = useSessionStore((state) => state.user);

  if (user === null) return children;

  return <Shell user={user}>{children}</Shell>;
}

function Shell({
  user,
  children,
}: {
  readonly user: AuthUserView;
  readonly children: ReactNode;
}): ReactNode {
  const t = useT();
  const groups = useNavGroups(user);
  const [open, setOpen] = useState(false);
  const current = useCurrent(groups);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Box
        sx={{
          display: 'grid',
          gap: { xs: 2, md: 4 },
          alignItems: 'start',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '240px minmax(0, 1fr)' },
        }}
      >
        <Box
          component="nav"
          aria-label={t('cabinet.nav.label')}
          sx={{ position: { md: 'sticky' }, top: { md: 88 }, minWidth: 0 }}
        >
          {/* Телефон: строка с текущим разделом раскрывает меню. */}
          <ButtonBase
            onClick={() => {
              setOpen(!open);
            }}
            aria-expanded={open}
            sx={{
              display: { xs: 'flex', md: 'none' },
              width: '100%',
              justifyContent: 'space-between',
              px: 2,
              minHeight: 48,
              borderRadius: 3,
              bgcolor: 'var(--paper)',
              boxShadow: 'var(--shadow-card)',
              fontWeight: 600,
            }}
          >
            {current?.label ?? t('page.cabinet.title')}
            <ChevronDown
              size={18}
              aria-hidden
              style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 180ms' }}
            />
          </ButtonBase>
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <NavList groups={groups} current={current} />
          </Box>
          <Collapse in={open} unmountOnExit sx={{ display: { md: 'none' } }}>
            <Box sx={{ mt: 1 }}>
              <NavList
                groups={groups}
                current={current}
                onPick={() => {
                  setOpen(false);
                }}
              />
            </Box>
          </Collapse>
        </Box>

        {/*
          Разделы кабинета написаны как отдельные страницы со своим
          контейнером. Внутри каркаса контейнер уже есть — у вложенного
          снимаются поля и предел ширины, чтобы не было двойного отступа.
        */}
        <Box
          sx={{
            minWidth: 0,
            '& > .MuiContainer-root': { px: 0, py: 0, maxWidth: 'none' },
            '& > .MuiContainer-root > h1:first-of-type, & > .MuiContainer-root > .MuiTypography-h1':
              { fontSize: { xs: 28, md: 32 } },
          }}
        >
          {children}
        </Box>
      </Box>
    </Container>
  );
}

function NavList({
  groups,
  current,
  onPick,
}: {
  readonly groups: readonly NavGroup[];
  readonly current: NavItem | undefined;
  readonly onPick?: () => void;
}): ReactNode {
  const t = useT();

  return (
    <Box
      sx={{
        p: 1,
        borderRadius: 3,
        bgcolor: 'var(--paper)',
        boxShadow: 'var(--shadow-card)',
        display: 'grid',
        gap: 0.25,
      }}
      data-cabinet-nav
    >
      {groups.map((group, index) =>
        group.items.length === 0 ? null : (
          <Box key={group.title ?? `group-${String(index)}`} sx={{ display: 'grid', gap: 0.25 }}>
            {group.title !== null && (
              <Typography
                variant="caption"
                component="p"
                sx={{
                  px: 1.5,
                  pt: index === 0 ? 0.5 : 1.5,
                  pb: 0.5,
                  color: 'text.secondary',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {t(group.title)}
              </Typography>
            )}
            {group.items.map((item) => (
              <NavLink key={item.href} item={item} active={item === current} onPick={onPick} />
            ))}
          </Box>
        ),
      )}
    </Box>
  );
}

function NavLink({
  item,
  active,
  onPick,
}: {
  readonly item: NavItem;
  readonly active: boolean;
  readonly onPick: (() => void) | undefined;
}): ReactNode {
  const Icon = item.icon;

  return (
    <ButtonBase
      LinkComponent={RouterLink}
      href={item.href}
      onClick={onPick}
      aria-current={active ? 'page' : undefined}
      sx={{
        justifyContent: 'flex-start',
        gap: 1.25,
        px: 1.5,
        minHeight: 40,
        borderRadius: 2,
        typography: 'body2',
        fontWeight: active ? 700 : 500,
        color: active ? 'var(--red-700)' : 'var(--ink-700)',
        bgcolor: active ? 'var(--red-50)' : 'transparent',
        textAlign: 'left',
        transition: 'background-color var(--dur-fast) var(--ease)',
        '&:hover': { bgcolor: active ? 'var(--red-50)' : 'var(--paper-hover)' },
      }}
    >
      <Icon size={18} aria-hidden style={{ flexShrink: 0 }} />
      <Box
        component="span"
        sx={{
          minWidth: 0,
          flexGrow: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {item.label}
      </Box>
      {item.note !== undefined && (
        <Box component="span" sx={{ typography: 'caption', color: 'text.secondary' }}>
          {item.note}
        </Box>
      )}
      {item.count !== undefined && item.count > 0 && (
        <Box
          component="span"
          sx={{
            minWidth: 22,
            height: 22,
            px: 0.75,
            borderRadius: 11,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'var(--red-600)',
            color: 'var(--paper)',
            typography: 'caption',
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {item.count}
        </Box>
      )}
    </ButtonBase>
  );
}

/** Активный пункт: точное совпадение пути, у клуба — и вложенные адреса. */
function useCurrent(groups: readonly NavGroup[]): NavItem | undefined {
  const { pathname, searchStr } = useLocation();
  const here = `${pathname}${searchStr}`;
  const items = groups.flatMap((group) => group.items);

  return (
    items.find((item) => item.href === here) ??
    items.find((item) => item.href === pathname) ??
    items.find((item) => item.prefix === true && pathname.startsWith(item.href))
  );
}

function useNavGroups(user: AuthUserView): NavGroup[] {
  const t = useT();
  const clubs = useMyClubs(user);
  const unread = useQuery(unreadNotificationsQuery).data?.unread ?? 0;
  const admin = user.isAdmin;
  const applications = useQuery({ ...newClubApplicationsCountQuery, enabled: admin }).data ?? 0;
  const coaches = useQuery({ ...pendingCoachesCountQuery, enabled: admin }).data ?? 0;
  const reports =
    useQuery({ ...forumReportsQuery({ status: 'OPEN', limit: 1 }), enabled: admin }).data?.total ??
    0;
  const disputes =
    useQuery({ ...adminDuelsQuery({ status: 'DISPUTED', limit: 1 }), enabled: admin }).data
      ?.total ?? 0;

  const groups: NavGroup[] = [
    {
      title: null,
      items: [
        { href: '/cabinet', label: t('cabinet.nav.overview'), icon: LayoutDashboard },
        { href: '/notifications', label: t('notifications.title'), icon: Bell, count: unread },
      ],
    },
    {
      title: 'cabinet.nav.player',
      items: [
        user.playerId === null
          ? { href: '/settings/profile', label: t('cabinet.nav.findProfile'), icon: User }
          : { href: `/players/${user.playerId}`, label: t('nav.myProfile'), icon: User },
        ...(user.playerId === null
          ? []
          : [{ href: '/duels/mine', label: t('duel.mine.title'), icon: Swords }]),
      ],
    },
    {
      title: 'nav.myClubs',
      items: [
        ...clubs.map((club): NavItem => ({
          href: club.role === 'REFEREE' ? `/clubs/${club.id}` : `/cabinet/club/${club.id}`,
          label: club.name ?? '…',
          icon: Building2,
          prefix: true,
          ...(club.hidden
            ? { note: t('cabinet.nav.hidden') }
            : club.role === 'REFEREE'
              ? { note: t('cabinet.nav.referee') }
              : {}),
        })),
        ...(clubs.length > 0
          ? [{ href: '/cabinet/clubs', label: t('cabinet.clubs.all'), icon: Plus }]
          : []),
      ],
    },
    {
      title: 'cabinet.nav.coach',
      items:
        user.coach === null && user.playerId === null
          ? []
          : [{ href: '/cabinet/coach', label: t('page.coach.title'), icon: UserCog }],
    },
    {
      title: 'cabinet.admin.title',
      items: admin
        ? [
            {
              href: '/cabinet/applications',
              label: t('cabinet.admin.applications'),
              icon: Flag,
              count: applications,
            },
            {
              href: '/cabinet/applications?tab=coaches',
              label: t('cabinet.admin.coaches'),
              icon: ShieldCheck,
              count: coaches,
            },
            { href: '/cabinet/content', label: t('page.content.title'), icon: Megaphone },
            {
              href: '/cabinet/forum',
              label: t('cabinet.admin.forum'),
              icon: MessagesSquare,
              count: reports,
            },
            {
              href: '/cabinet/duels',
              label: t('cabinet.admin.duels'),
              icon: Swords,
              count: disputes,
            },
            { href: '/cabinet/places', label: t('page.places.title'), icon: MapPinned },
            { href: '/cabinet/catalog', label: t('page.catalog.title'), icon: BookOpen },
          ]
        : [],
    },
    {
      title: 'nav.settings',
      items: [
        { href: '/settings/profile', label: t('settings.profile.tab'), icon: Users },
        { href: '/settings/account', label: t('settings.account.tab'), icon: Settings },
      ],
    },
  ];

  return groups;
}
