import {
  ArrowLeft,
  BookOpen,
  Flag,
  LayoutDashboard,
  MapPinned,
  Megaphone,
  MessagesSquare,
  Newspaper,
  ShieldCheck,
  Swords,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import { useSessionStore } from '@/features/auth/session-store';
import NavShell, { type NavGroup } from '@/features/cabinet/nav-shell';

import { useAdminQueues } from './queues';

/**
 * Администрирование — отдельный модуль со своим меню (ADR-075).
 *
 * Раньше его разделы жили пунктами кабинета вперемешку с клубами и игрой.
 * Здесь всё, что делает администратор платформы: очереди заявок, модерация
 * ленты, форума и дуэлей, контент, справочники.
 */
export default function AdminShell({ children }: { readonly children: ReactNode }): ReactNode {
  const t = useT();
  const admin = useSessionStore((state) => state.user?.isAdmin ?? false);
  const queues = useAdminQueues(admin);

  const groups: NavGroup[] = [
    {
      title: null,
      items: [{ href: '/admin', label: t('admin.nav.overview'), icon: LayoutDashboard }],
    },
    {
      title: 'admin.nav.requests',
      items: [
        {
          href: '/admin/applications',
          label: t('cabinet.admin.applications'),
          icon: Flag,
          count: queues.applications,
        },
        {
          href: '/admin/applications?tab=coaches',
          label: t('cabinet.admin.coaches'),
          icon: ShieldCheck,
          count: queues.coaches,
        },
      ],
    },
    {
      title: 'admin.nav.moderation',
      items: [
        { href: '/admin/feed', label: t('admin.nav.feed'), icon: Newspaper },
        {
          href: '/admin/forum',
          label: t('cabinet.admin.forum'),
          icon: MessagesSquare,
          count: queues.reports,
        },
        {
          href: '/admin/duels',
          label: t('cabinet.admin.duels'),
          icon: Swords,
          count: queues.disputes,
        },
        { href: '/admin/content', label: t('page.content.title'), icon: Megaphone },
      ],
    },
    {
      title: 'admin.nav.directories',
      items: [
        { href: '/admin/places', label: t('page.places.title'), icon: MapPinned },
        { href: '/admin/catalog', label: t('page.catalog.title'), icon: BookOpen },
      ],
    },
    {
      title: null,
      items: [{ href: '/cabinet', label: t('admin.nav.back'), icon: ArrowLeft }],
    },
  ];

  return (
    <NavShell groups={groups} label={t('admin.nav.label')} title={t('cabinet.admin.title')}>
      {children}
    </NavShell>
  );
}
