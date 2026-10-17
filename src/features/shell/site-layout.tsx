import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import ThemeRoot from '@/common/ui/theme';

import BottomNav, { BOTTOM_NAV_HEIGHT } from './bottom-nav';
import SiteHeader from './site-header';

interface SiteLayoutProps {
  /**
   * Фон под содержимым. Кабинет лежит на утопленной подложке: формы и
   * карточки в нём — поверхности, и на белом они бы слились с фоном.
   */
  readonly surface?: 'paper' | 'sunken';
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
export default function SiteLayout({ surface = 'paper', children }: SiteLayoutProps): ReactNode {
  const t = useT();

  return (
    <ThemeRoot>
      <Box
        sx={{
          display: 'flex',
          minHeight: '100%',
          flexDirection: 'column',
          bgcolor: surface === 'sunken' ? 'var(--paper-sunken)' : 'background.paper',
          // Нижняя панель на телефоне фиксирована и иначе закрыла бы подвал.
          pb: { xs: `${String(BOTTOM_NAV_HEIGHT)}px`, sm: 0 },
        }}
      >
        <SiteHeader />
        <Box component="main" sx={{ flexGrow: 1 }}>
          {children}
        </Box>
        <Box
          component="footer"
          sx={{
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            px: 2,
            py: 3,
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {t('app.tagline')}
          </Typography>
          {/* Инстаграм — единственный внешний канал федерации: турниры
              объявляются там, и игрок ищет их сначала в нём. */}
          <Link
            href="https://www.instagram.com/kttf.kz"
            target="_blank"
            rel="noreferrer"
            variant="body2"
            sx={{ display: 'inline-block', mt: 1 }}
          >
            {t('footer.instagram')}
          </Link>
        </Box>
        <BottomNav />
      </Box>
    </ThemeRoot>
  );
}
