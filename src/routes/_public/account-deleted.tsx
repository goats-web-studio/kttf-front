import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import PageHeader from '@/common/ui/page-header';

/** Итог удаления аккаунта — ADR-092. Сессии уже нет, страница публичная. */
export const Route = createFileRoute('/_public/account-deleted')({
  component: AccountDeletedPage,
});

function AccountDeletedPage(): ReactNode {
  const t = useT();

  return (
    <Container maxWidth="sm" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <PageHeader title={t('account.delete.done.title')} />
      <Typography sx={{ mb: 3 }}>{t('account.delete.done.text')}</Typography>
      <Button variant="contained" href="/" sx={{ minHeight: 44 }}>
        {t('account.delete.done.home')}
      </Button>
    </Container>
  );
}
