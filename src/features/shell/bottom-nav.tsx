import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import { useMatchRoute } from '@tanstack/react-router';
import { Building2, CalendarDays, TrendingUp, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import RouterLink from '@/common/ui/router-link';

import { SECTIONS } from './sections';

/** Высота панели — по ней оболочка оставляет место под подвал. */
export const BOTTOM_NAV_HEIGHT = 64;

/** Иконки разделов. Только вместе с подписью — запрет №11. */
const ICONS: Readonly<Record<string, LucideIcon>> = {
  '/ratings': TrendingUp,
  '/tournaments': CalendarDays,
  '/clubs': Building2,
};

/**
 * Разделы на телефоне — docs/07-design-system.md, раздел 4: «мобильный —
 * нижняя панель навигации».
 *
 * Иконка над подписью: по ней раздел находят большим пальцем, не читая.
 * Подпись остаётся всегда — иконка без подписи в основной навигации —
 * запрет №11 той же системы.
 */
export default function BottomNav(): ReactNode {
  const t = useT();
  const matchRoute = useMatchRoute();
  const current = SECTIONS.find((section) => matchRoute({ to: section.to, fuzzy: true }) !== false);

  return (
    <Paper
      component="nav"
      aria-label={t('nav.sections')}
      square
      elevation={0}
      sx={{
        display: { xs: 'block', sm: 'none' },
        position: 'fixed',
        insetInline: 0,
        bottom: 0,
        zIndex: 'appBar',
        borderTop: 1,
        borderColor: 'divider',
        pb: 'env(safe-area-inset-bottom)',
      }}
    >
      <BottomNavigation showLabels value={current?.to ?? false} sx={{ height: BOTTOM_NAV_HEIGHT }}>
        {SECTIONS.map((section) => {
          const Icon = ICONS[section.to];

          return (
            <BottomNavigationAction
              key={section.to}
              value={section.to}
              label={t(section.label)}
              {...(Icon === undefined ? {} : { icon: <Icon size={22} aria-hidden /> })}
              component={RouterLink}
              href={section.to}
              aria-current={current?.to === section.to ? 'page' : undefined}
              // Подпись одного размера в выбранном и прочих пунктах: по
              // умолчанию MUI увеличивает выбранную, и соседние подписи едут.
              sx={{
                minWidth: 0,
                gap: 0.25,
                '& .MuiBottomNavigationAction-label, &.Mui-selected .MuiBottomNavigationAction-label':
                  { typography: 'caption', fontWeight: 600 },
              }}
            />
          );
        })}
      </BottomNavigation>
    </Paper>
  );
}
