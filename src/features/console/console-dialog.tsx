import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useId, type ReactNode } from 'react';

import { useT } from '@/common/i18n';

interface ConsoleDialogProps {
  /** Мелкая строка над заголовком: этап, группа, номер стола. */
  readonly caption: string;
  readonly title: ReactNode;
  readonly onClose: () => void;
  readonly children: ReactNode;
}

/**
 * Окно действия консоли.
 *
 * На телефоне — на весь экран: судья держит его одной рукой, и кнопки счёта
 * должны быть там, куда дотягивается большой палец, а не в середине
 * маленькой карточки поверх зала. На планшете и ноутбуке — обычное окно,
 * зал остаётся виден по краям.
 *
 * Закрывается кнопкой, касанием фона и клавишей Esc: судья, открывший
 * не ту встречу, уходит оттуда одним движением.
 */
export default function ConsoleDialog({
  caption,
  title,
  onClose,
  children,
}: ConsoleDialogProps): ReactNode {
  const t = useT();
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  const titleId = useId();

  return (
    <Dialog
      open
      onClose={onClose}
      fullScreen={phone}
      fullWidth
      maxWidth="sm"
      aria-labelledby={titleId}
      slotProps={{ paper: { sx: { bgcolor: 'background.paper', backgroundImage: 'none' } } }}
    >
      <Box
        component="header"
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1,
          px: 2,
          pt: 2,
          pb: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" component="p">
            {caption}
          </Typography>
          <Typography
            id={titleId}
            component="h2"
            sx={{ fontSize: 17, lineHeight: '26px', fontWeight: 600 }}
          >
            {title}
          </Typography>
        </Box>
        <Button
          variant="text"
          onClick={onClose}
          sx={{ minHeight: 48, color: 'text.secondary', flexShrink: 0 }}
        >
          {t('console.dialog.close')}
        </Button>
      </Box>
      <DialogContent sx={{ px: 2, py: 2 }}>{children}</DialogContent>
    </Dialog>
  );
}

/** Подзаголовок раздела внутри окна. */
export function DialogSection({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <Box component="section" sx={{ mt: 3, '&:first-of-type': { mt: 0 } }}>
      <Typography
        component="h3"
        variant="subtitle2"
        color="text.secondary"
        sx={{ mb: 1, fontWeight: 600 }}
      >
        {title}
      </Typography>
      {children}
    </Box>
  );
}
