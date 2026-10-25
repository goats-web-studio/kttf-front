import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { createFileRoute } from '@tanstack/react-router';
import {
  BookOpen,
  Flag,
  MapPinned,
  Megaphone,
  MessagesSquare,
  Newspaper,
  ShieldCheck,
  Swords,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { formatCount, useLocale, useT, type MessageKey } from '@/common/i18n';
import EmptyState from '@/common/ui/empty-state';
import RouterLink from '@/common/ui/router-link';
import { useAdminQueues } from '@/features/admin/queues';
import { useSessionStore } from '@/features/auth/session-store';

export const Route = createFileRoute('/_app/admin/')({
  component: AdminOverview,
});

interface Tile {
  readonly href: string;
  readonly title: MessageKey;
  readonly text: MessageKey;
  readonly icon: LucideIcon;
  readonly count?: number;
}

/**
 * Обзор администрирования — ADR-075: всё хозяйство платформы плитками,
 * у очередей — сколько ждёт. Ждущие — первыми: с них начинают день.
 */
function AdminOverview(): ReactNode {
  const t = useT();
  const locale = useLocale();
  const admin = useSessionStore((state) => state.user?.isAdmin ?? false);
  const queues = useAdminQueues(admin);

  if (!admin) {
    return (
      <Container maxWidth="lg" component="section">
        <EmptyState title={t('admin.forbidden')} />
      </Container>
    );
  }

  const tiles: readonly Tile[] = [
    {
      href: '/admin/applications',
      title: 'cabinet.admin.applications',
      text: 'admin.tile.applications',
      icon: Flag,
      count: queues.applications,
    },
    {
      href: '/admin/applications?tab=coaches',
      title: 'cabinet.admin.coaches',
      text: 'admin.tile.coaches',
      icon: ShieldCheck,
      count: queues.coaches,
    },
    {
      href: '/admin/forum',
      title: 'cabinet.admin.forum',
      text: 'admin.tile.forum',
      icon: MessagesSquare,
      count: queues.reports,
    },
    {
      href: '/admin/duels',
      title: 'cabinet.admin.duels',
      text: 'admin.tile.duels',
      icon: Swords,
      count: queues.disputes,
    },
    { href: '/admin/feed', title: 'admin.nav.feed', text: 'admin.tile.feed', icon: Newspaper },
    {
      href: '/admin/content',
      title: 'page.content.title',
      text: 'admin.tile.content',
      icon: Megaphone,
    },
    {
      href: '/admin/places',
      title: 'page.places.title',
      text: 'admin.tile.places',
      icon: MapPinned,
    },
    {
      href: '/admin/catalog',
      title: 'page.catalog.title',
      text: 'admin.tile.catalog',
      icon: BookOpen,
    },
  ];
  const ordered = [...tiles].sort((left, right) => (right.count ?? 0) - (left.count ?? 0));

  return (
    <Container maxWidth="lg" component="section">
      <Typography variant="h1">{t('cabinet.admin.title')}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
        {queues.total > 0 ? t('admin.lead.busy') : t('admin.lead.calm')}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))',
        }}
        data-admin-tiles
      >
        {ordered.map((tile) => {
          const Icon = tile.icon;
          const waiting = (tile.count ?? 0) > 0;

          return (
            <ButtonBase
              key={tile.href}
              LinkComponent={RouterLink}
              href={tile.href}
              sx={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                alignItems: 'start',
                gap: 1.5,
                p: 2.5,
                borderRadius: 3,
                textAlign: 'left',
                bgcolor: 'var(--paper)',
                boxShadow: 'var(--shadow-card)',
                border: '1px solid',
                borderColor: waiting ? 'var(--red-200)' : 'transparent',
                transition: 'box-shadow var(--dur-fast) var(--ease)',
                '&:hover': { boxShadow: 'var(--shadow-card-hover)' },
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: waiting ? 'var(--red-50)' : 'var(--paper-sunken)',
                  color: waiting ? 'var(--red-700)' : 'var(--ink-700)',
                }}
              >
                <Icon size={20} aria-hidden />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700 }}>{t(tile.title)}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t(tile.text)}
                </Typography>
              </Box>
              {waiting && (
                <Box
                  sx={{
                    px: 1,
                    minWidth: 28,
                    height: 28,
                    borderRadius: 14,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: 'var(--red-600)',
                    color: 'var(--paper)',
                    fontWeight: 700,
                    typography: 'body2',
                  }}
                >
                  {formatCount(tile.count ?? 0, locale)}
                </Box>
              )}
            </ButtonBase>
          );
        })}
      </Box>
    </Container>
  );
}
