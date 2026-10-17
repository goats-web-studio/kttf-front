import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import { useMatchRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import RouterLink from '@/common/ui/router-link';

import { SECTIONS } from './sections';

/** Высота панели — по ней оболочка оставляет место под подвал. */
export const BOTTOM_NAV_HEIGHT = 56;

/**
 * Разделы на телефоне — docs/07-design-system.md, раздел 4: «мобильный —
 * нижняя панель навигации».
 *
 * Подписи словами, без иконок: иконка без подписи в основной навигации —
 * запрет №11 той же системы, а подпись под иконкой здесь и так всё говорит.
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
        {SECTIONS.map((section) => (
          <BottomNavigationAction
            key={section.to}
            value={section.to}
            label={t(section.label)}
            component={RouterLink}
            href={section.to}
            aria-current={current?.to === section.to ? 'page' : undefined}
            // Подпись одного размера в выбранном и прочих пунктах: по
            // умолчанию MUI увеличивает выбранную, и соседние подписи едут.
            sx={{
              minWidth: 0,
              '& .MuiBottomNavigationAction-label, &.Mui-selected .MuiBottomNavigationAction-label':
                { typography: 'body2' },
            }}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
