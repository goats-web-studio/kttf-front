import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

import ThemeRoot from '@/common/ui/theme';

import BottomNav, { BOTTOM_NAV_HEIGHT } from './bottom-nav';
import SiteBackdrop from './site-backdrop';
import SiteFooter from './site-footer';
import SiteHeader from './site-header';

interface SiteLayoutProps {
  readonly children: ReactNode;
}

/**
 * Оболочка сайта — одна на публичную часть и кабинет.
 *
 * Раньше у кабинета была своя шапка, без разделов: из создания турнира нельзя
 * было попасть ни в рейтинг, ни в календарь. Человек переходит между
 * публичным и своим постоянно — смотрит турнир и идёт его вести, — и две
 * навигации на одном сайте читаются как два сайта.
 *
 * Консоль и экран зала сюда не входят намеренно: у них ночная тема, а всё,
 * что попадает в консоль, считается против бюджета 400 КБ (ТС 8.1).
 */
export default function SiteLayout({ children }: SiteLayoutProps): ReactNode {
  return (
    <ThemeRoot>
      <Box
        sx={{
          display: 'flex',
          minHeight: '100%',
          flexDirection: 'column',
          // Один фон на публичную часть и кабинет — тёплая подложка. Белыми
          // остаются поверхности: шапка, карточки, поля. Раньше публичная
          // часть была на белом, кабинет на сером, и переход между ними
          // читался как переход на другой сайт.
          bgcolor: 'background.default',
          // Нижняя панель на телефоне фиксирована и иначе закрыла бы подвал.
          pb: { xs: `${String(BOTTOM_NAV_HEIGHT)}px`, sm: 0 },
        }}
      >
        <SiteHeader />
        <Box component="main" sx={{ flexGrow: 1, position: 'relative' }}>
          <SiteBackdrop />
          <Box sx={{ position: 'relative', zIndex: 1 }}>{children}</Box>
        </Box>
        <SiteFooter />
        <BottomNav />
      </Box>
    </ThemeRoot>
  );
}
