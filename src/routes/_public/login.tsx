import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { z } from 'zod';

import { useT } from '@/common/i18n';
import SignInForm from '@/features/auth/sign-in-form';

/** Куда вернуться после входа. Кладёт сюда охрана кабинета. */
const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute('/_public/login')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: LoginPage,
});

function LoginPage(): ReactNode {
  const t = useT();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();

  return (
    <section className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">{t('page.login.title')}</h1>
      <SignInForm
        onSignedIn={() => {
          void navigate({ href: redirect ?? '/' });
        }}
      />
    </section>
  );
}
