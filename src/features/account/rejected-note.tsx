import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { fill, formatDate, useLocale, useT } from '@/common/i18n';

/**
 * Отказ администратора — с его ответом: без причины человеку непонятно,
 * что делать дальше. Общий для заявок на удаление и на восстановление.
 */
export default function RejectedNote({
  title,
  date,
  answer,
}: {
  readonly title: string;
  readonly date: string;
  readonly answer: string | null;
}): ReactNode {
  const t = useT();
  const locale = useLocale();

  return (
    <Alert severity="warning" data-request-rejected>
      <Typography variant="body2">{fill(title, { date: formatDate(date, locale) })}</Typography>
      {answer !== null && answer !== '' && (
        <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-line' }}>
          {t('account.request.answer')}: {answer}
        </Typography>
      )}
    </Alert>
  );
}
