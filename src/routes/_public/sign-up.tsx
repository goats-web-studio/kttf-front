import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import SignUpForm from '@/features/auth/sign-up-form';

export const Route = createFileRoute('/_public/sign-up')({
  component: SignUpPage,
});

/**
 * Регистрация — ТЗ 2.1, ADR-034.
 *
 * Отдельным адресом, а не вкладкой на входе: ссылку на регистрацию тренер
 * отправляет игроку в чат, и она обязана открываться сразу нужной формой.
 */
function SignUpPage(): ReactNode {
  const t = useT();
  const navigate = useNavigate();

  return (
    <Container maxWidth="xs" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <Typography variant="h1" sx={{ mb: 3 }}>
        {t('page.signUp.title')}
      </Typography>
      <SignUpForm
        onSignedUp={() => {
          // После регистрации человек попадает в кабинет: там он дозаполняет
          // профиль, если игроком себя не назвал (ТЗ 2.2).
          void navigate({ to: '/cabinet' });
        }}
      />
    </Container>
  );
}
