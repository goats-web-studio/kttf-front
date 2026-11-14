import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import {
  CalendarDays,
  MapPin,
  MessagesSquare,
  ShoppingBag,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import RouterLink from '@/common/ui/router-link';

import { useActiveSection } from './active-section';
import { SECTIONS } from './sections';

/** Высота панели — по ней оболочка оставляет место под подвал. */
export const BOTTOM_NAV_HEIGHT = 64;

/** Иконки разделов. Только вместе с подписью — запрет №11. */
const ICONS: Readonly<Record<string, LucideIcon>> = {
  '/tournaments': CalendarDays,
  '/players': Trophy,
  '/clubs': MapPin,
  '/forum': MessagesSquare,
  '/market': ShoppingBag,
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
  const current = useActiveSection();

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
              // Пять разделов в 360px: по 72px на пункт, и «Где играть» и
              // «Сообщество» влезают только без боковых полей и в 11px —
              // нижняя ступень шкалы (07, 3.5).
              sx={{
                minWidth: 0,
                px: 0.25,
                gap: 0.25,
                '& .MuiBottomNavigationAction-label, &.Mui-selected .MuiBottomNavigationAction-label':
                  {
                    typography: 'caption',
                    fontWeight: 600,
                    fontSize: { xs: 11, sm: 12 },
                    whiteSpace: 'nowrap',
                  },
              }}
            />
          );
        })}
      </BottomNavigation>
    </Paper>
  );
}
