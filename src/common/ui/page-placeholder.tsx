import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

interface PagePlaceholderProps {
  readonly title: string;
  readonly children?: ReactNode;
}

/**
 * Заглушка раздела.
 *
 * Каркас доводит до экрана маршрутизацию и оболочку, а не содержимое:
 * рейтинги, календарь и профили приходят своими задачами (ТЗ 9).
 */
export default function PagePlaceholder({ title, children }: PagePlaceholderProps): ReactNode {
  const t = useT();

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <Typography variant="h1">{title}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        {t('common.soon')}
      </Typography>
      {children}
    </Container>
  );
}
