import type { AuthUserView } from '@kttf/shared/types';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  Building2,
  CalendarCheck,
  Dumbbell,
  Heart,
  LayoutDashboard,
  NotebookPen,
  Plus,
  Settings,
  ShieldCheck,
  Swords,
  User,
  UserCog,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import { useAdminQueues } from '@/features/admin/queues';
import { useSessionStore } from '@/features/auth/session-store';
import { unreadNotificationsQuery } from '@/features/notifications/queries';

import { useMyClubs } from './my-clubs';
import NavShell, { type NavGroup, type NavItem } from './nav-shell';

/**
 * Кабинет с боковым меню — ADR-074, ADR-075.
 *
 * Всё, что у человека есть в системе, — пунктами по ролям: игрок (турниры,
 * тренировки, дуэли и спарринги, записи, подписки), клубы, тренер.
 * Администрирование — отдельный модуль `/admin`: здесь одна ссылка с общим
 * числом ждущих дел.
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
  const groups = useCabinetGroups(user);

  return (
    <NavShell groups={groups} label={t('cabinet.nav.label')} title={t('page.cabinet.title')}>
      {children}
    </NavShell>
  );
}

function useCabinetGroups(user: AuthUserView): NavGroup[] {
  const t = useT();
  const clubs = useMyClubs(user);
  const unread = useQuery(unreadNotificationsQuery).data?.unread ?? 0;
  const queues = useAdminQueues(user.isAdmin);
  const player = user.playerId;

  return [
    {
      title: null,
      items: [
        { href: '/cabinet', label: t('cabinet.nav.overview'), icon: LayoutDashboard },
        { href: '/notifications', label: t('notifications.title'), icon: Bell, count: unread },
      ],
    },
    {
      title: 'cabinet.nav.player',
      items:
        player === null
          ? [{ href: '/settings/profile', label: t('cabinet.nav.findProfile'), icon: User }]
          : [
              { href: `/players/${player}`, label: t('nav.myProfile'), icon: User },
              {
                href: '/cabinet/tournaments',
                label: t('cabinet.nav.tournaments'),
                icon: CalendarCheck,
              },
              { href: '/cabinet/trainings', label: t('cabinet.nav.trainings'), icon: Dumbbell },
              { href: '/cabinet/duels', label: t('cabinet.nav.duels'), icon: Swords },
              { href: '/cabinet/posts', label: t('cabinet.nav.posts'), icon: NotebookPen },
              { href: '/cabinet/follows', label: t('cabinet.nav.follows'), icon: Heart },
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
        player === null
          ? []
          : [{ href: '/cabinet/coach', label: t('page.coach.title'), icon: UserCog }],
    },
    {
      title: null,
      items: user.isAdmin
        ? [
            {
              href: '/admin',
              label: t('cabinet.admin.title'),
              icon: ShieldCheck,
              count: queues.total,
            },
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
}
