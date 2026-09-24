import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

export const Route = createFileRoute('/_public/')({
  component: HomePage,
});

function HomePage(): ReactNode {
  const t = useT();

  return (
    <Container maxWidth="md" component="section" sx={{ py: { xs: 8, sm: 12 } }}>
      <Typography variant="h1">{t('page.home.title')}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1.5 }}>
        {t('page.home.lead')}
      </Typography>
    </Container>
  );
}
