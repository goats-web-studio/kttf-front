import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Snackbar from '@mui/material/Snackbar';
import type { ReactNode } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { useT } from '@/common/i18n';

/**
 * Кнопка подсказки. `ButtonBase`, а не `Button`: подсказка живёт над
 * маршрутами, вне оболочки раздела и её темы. Ставить сюда вторую тему нельзя:
 * тема с CSS-переменными пишет их в `:root` и перебила бы тему раздела —
 * консоль посветлела бы, пока висит подсказка. Цвета поэтому берутся прямо из
 * ночных токенов `styles.css`, а высота на телефоне — не меньше 44px (раздел 9).
 */
const ACTION = {
  minHeight: { xs: 44, sm: 40 },
  flexShrink: 0,
  px: 1.5,
  borderRadius: 1,
  font: 'inherit',
  fontWeight: 500,
  '&.Mui-focusVisible': { outline: '2px solid var(--night-red)', outlineOffset: 2 },
} as const;

/**
 * Предложение обновиться.
 *
 * Обновление не применяется само. Автоматическая перезагрузка вкладки в момент
 * выкатки может застать судью посреди турнира, а приоритет №2 брифа ставит
 * надёжность консоли выше свежести версии. Момент выбирает человек.
 */
export default function UpdatePrompt(): ReactNode {
  const t = useT();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) {
    return null;
  }

  return (
    <Snackbar open anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      <Box
        role="status"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          width: '100%',
          maxWidth: 448,
          px: 2,
          py: 1.5,
          borderRadius: 2,
          bgcolor: 'var(--night)',
          color: 'var(--night-ink-900)',
          boxShadow: 'var(--shadow-modal)',
          fontSize: 13,
          lineHeight: '20px',
        }}
      >
        <Box component="span" sx={{ flexGrow: 1 }}>
          {t('pwa.update.message')}
        </Box>
        <ButtonBase
          disableRipple
          sx={{
            ...ACTION,
            bgcolor: 'var(--paper)',
            color: 'var(--ink-900)',
            '&:hover': { bgcolor: 'var(--paper-hover)' },
          }}
          onClick={() => void updateServiceWorker(true)}
        >
          {t('pwa.update.apply')}
        </ButtonBase>
        <ButtonBase
          disableRipple
          sx={{ ...ACTION, color: 'var(--night-ink-700)' }}
          onClick={() => {
            setNeedRefresh(false);
          }}
        >
          {t('pwa.update.dismiss')}
        </ButtonBase>
      </Box>
    </Snackbar>
  );
}
