import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { useT, type MessageKey } from '@/common/i18n';
import RouterLink from '@/common/ui/router-link';

export type SettingsSection = 'profile' | 'account';

const SECTIONS: readonly (readonly [SettingsSection, string, MessageKey])[] = [
  ['profile', '/settings/profile', 'settings.profile.tab'],
  ['account', '/settings/account', 'settings.account.tab'],
];

/**
 * Настройки — две страницы под одним заголовком, ADR-048.
 *
 * Профиль игрока — то, что видят другие на публичной странице; аккаунт —
 * то, чем человек входит и как с ним связаться. Сущности разные и в модели
 * (ADR-035): у судьи аккаунт без профиля, у игрока, заведённого тренером, —
 * профиль без аккаунта. Раньше обе формы жили в кабинете вперемешку с
 * клубами и администрированием.
 *
 * Разделы — ссылками, а не вкладками на одной странице: «Настройки →
 * Аккаунт» открывается по адресу, и кнопка «Назад» возвращает туда, откуда
 * пришли.
 */
export default function SettingsLayout({
  section,
  lead,
  children,
}: {
  readonly section: SettingsSection;
  readonly lead: string;
  readonly children: ReactNode;
}): ReactNode {
  const t = useT();

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <Typography variant="h1">{t('page.settings.title')}</Typography>

      <Tabs
        value={section}
        aria-label={t('settings.nav')}
        variant="scrollable"
        scrollButtons={false}
        sx={{ mt: 3 }}
      >
        {SECTIONS.map(([value, href, label]) => (
          <Tab
            key={value}
            value={value}
            label={t(label)}
            component={RouterLink}
            href={href}
            aria-current={value === section ? 'page' : undefined}
          />
        ))}
      </Tabs>

      <Typography color="text.secondary" sx={{ mt: 2.5, maxWidth: '68ch' }}>
        {lead}
      </Typography>

      <Box className="tab-panel-in" sx={{ mt: 3, display: 'grid', gap: 2 }}>
        {children}
      </Box>
    </Container>
  );
}
