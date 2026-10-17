import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import SiteLayout from '@/features/shell/site-layout';

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

/** Кабинет: та же шапка, что у публичной части, на утопленной подложке. */
function AppLayout(): ReactNode {
  return (
    <SiteLayout surface="sunken">
      <Outlet />
    </SiteLayout>
  );
}
