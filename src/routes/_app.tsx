import { createFileRoute, Link, Outlet, redirect } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

export const Route = createFileRoute('/_app')({
  /**
   * Охрана кабинета в одной точке, а не на каждой странице.
   *
   * Забыть проверку на отдельной странице легко, и тогда она молча
   * открывается всем. Здесь же это не защита данных: по ТС 8.3 права
   * проверяет бэкенд guard'ами, интерфейс только не показывает того,
   * чего человек всё равно не получит.
   */
  beforeLoad: ({ context }) => {
    if (context.session === null) {
      // Страницы входа ещё нет — она появится вместе с аутентификацией.
      // До тех пор возврат на публичную часть.
      throw redirect({ to: '/' });
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
        </nav>
      </header>
      <main className="grow">
        <Outlet />
      </main>
    </div>
  );
}
