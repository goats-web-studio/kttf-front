import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT, type MessageKey } from '@/common/i18n';

interface EditorSectionProps {
  readonly title: string;
  readonly lead?: string;
  readonly children: ReactNode;
  /** Без сохранения — раздел сохраняет сам (картинки уходят сразу). */
  readonly onSave?: () => void;
  readonly isPending?: boolean;
  readonly saved?: boolean;
  readonly error?: unknown;
  /** Ошибка формы до отправки — своя строка, а не ответ сервера. */
  readonly invalid?: MessageKey | null;
}

/**
 * Раздел редактора страницы клуба. Каждый раздел сохраняется сам: часы и
 * цены уходят на сервер целиком своими маршрутами (ADR-055), и одна общая
 * кнопка на шесть разделов означала бы шесть запросов и одну непонятную
 * ошибку на всех. Кнопка — обведённая: главное действие кабинета —
 * создать турнир (ADR-039).
 */
export default function EditorSection({
  title,
  lead,
  children,
  onSave,
  isPending = false,
  saved = false,
  error,
  invalid = null,
}: EditorSectionProps): ReactNode {
  const t = useT();

  return (
    <Paper variant="outlined" component="section" sx={{ mt: 3, p: { xs: 2.5, sm: 4 } }}>
      <Typography variant="h2">{title}</Typography>
      {lead !== undefined && (
        <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 680 }}>
          {lead}
        </Typography>
      )}
      <Box sx={{ mt: 3 }}>{children}</Box>
      {invalid !== null && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t(invalid)}
        </Alert>
      )}
      {error !== null && error !== undefined && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t(errorMessageKey(error))}
        </Alert>
      )}
      {saved && !isPending && invalid === null && (error === null || error === undefined) && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {t('manage.page.saved')}
        </Alert>
      )}
      {onSave !== undefined && (
        <Button
          variant="outlined"
          size="large"
          disabled={isPending}
          onClick={onSave}
          sx={{ mt: 3, width: { xs: '100%', sm: 'auto' } }}
        >
          {isPending ? t('common.loading') : t('manage.page.save')}
        </Button>
      )}
    </Paper>
  );
}
