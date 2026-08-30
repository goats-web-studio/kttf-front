import { createFileRoute, Link, Outlet, redirect } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import { signOut } from '@/features/auth/session';

export const Route = createFileRoute('/_app')({
  /**
   * Охрана кабинета в одной точке, а не на каждой странице.
   *
   * Забыть проверку на отдельной странице легко, и тогда она молча
   * открывается всем. Здесь же это не защита данных: по ТС 8.3 права
   * проверяет бэкенд guard'ами, интерфейс только не показывает того,
   * чего человек всё равно не получит.
   */
  beforeLoad: ({ context, location }) => {
    if (context.session === null) {
      // Адрес запоминается: человек, открывший ссылку на кабинет, обязан
      // попасть именно туда после входа, а не на главную.
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
  },
  component: AppLayout,
});

function AppLayout(): ReactNode {
  const t = useT();

  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-3xl items-center gap-6 px-4 py-4">
          <Link to="/" className="font-semibold text-slate-900">
            {t('app.name')}
          </Link>
          <button
            type="button"
            onClick={() => {
              void signOut();
            }}
            className="ml-auto text-sm text-slate-600 underline"
          >
            {t('login.signOut')}
          </button>
        </nav>
      </header>
      <main className="grow">
        <Outlet />
      </main>
    </div>
  );
}
