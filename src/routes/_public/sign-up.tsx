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
    <section className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">{t('page.signUp.title')}</h1>
      <SignUpForm
        onSignedUp={() => {
          // После регистрации человек попадает в кабинет: там он дозаполняет
          // профиль, если игроком себя не назвал (ТЗ 2.2).
          void navigate({ to: '/cabinet' });
        }}
      />
    </section>
  );
}
