import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import AuthCard from '@/common/ui/auth-card';
import { authHref, redirectSearchSchema } from '@/features/auth/redirect';
import SignInForm from '@/features/auth/sign-in-form';

/** Куда вернуться после входа. Кладёт сюда охрана кабинета. */
export const Route = createFileRoute('/_public/login')({
  validateSearch: (search: Record<string, unknown>) => redirectSearchSchema.parse(search),
  component: LoginPage,
});

function LoginPage(): ReactNode {
  const t = useT();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();

  return (
    <AuthCard title={t('page.login.title')}>
      <SignInForm
        // Адрес возврата идёт и на регистрацию: у гостя с главной часто нет
        // учётки, и после регистрации он должен попасть туда же.
        signUpHref={authHref('/sign-up', redirect)}
        onSignedIn={() => {
          void navigate({ href: redirect ?? '/' });
        }}
      />
    </AuthCard>
  );
}
