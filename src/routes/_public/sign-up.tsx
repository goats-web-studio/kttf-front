import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import AuthCard from '@/common/ui/auth-card';
import { redirectSearchSchema } from '@/features/auth/redirect';
import SignUpForm from '@/features/auth/sign-up-form';

/** Куда вернуться после регистрации — приходит со страницы входа. */
export const Route = createFileRoute('/_public/sign-up')({
  validateSearch: (search: Record<string, unknown>) => redirectSearchSchema.parse(search),
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
  const { redirect } = Route.useSearch();

  return (
    <AuthCard title={t('page.signUp.title')}>
      <SignUpForm
        onSignedUp={() => {
          // Пришёл с адресом возврата — туда: гость нажал «Стать тренером»
          // или «Оставить заявку» и зарегистрировался по дороге. Без адреса —
          // в кабинет: там он дозаполняет профиль, если игроком себя не
          // назвал (ТЗ 2.2).
          void navigate({ href: redirect ?? '/cabinet' });
        }}
      />
    </AuthCard>
  );
}
