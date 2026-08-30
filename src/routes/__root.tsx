import {
  createRootRouteWithContext,
  type ErrorComponentProps,
  Link,
  Outlet,
} from '@tanstack/react-router';
import type { ReactNode } from 'react';

import type { RouterContext } from '@/app/router-context';
import { useT } from '@/common/i18n';

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
  errorComponent: UnexpectedError,
});

/**
 * Корень намеренно пустой.
 *
 * Оболочки у разделов разные и несводимые: публичная часть с шапкой, кабинет,
 * консоль во весь экран планшета и экран зала без единого элемента управления.
 * Общая обёртка здесь означала бы, что зависимости публичной части попадают
 * в чанки консоли, а это прямо запрещено ADR-004.
 */
function RootLayout(): ReactNode {
  return <Outlet />;
}

function NotFound(): ReactNode {
  const t = useT();

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">{t('error.notFound.title')}</h1>
      <Link to="/" className="mt-4 inline-block text-blue-700 underline">
        {t('error.notFound.action')}
      </Link>
    </section>
  );
}

function UnexpectedError({ reset }: ErrorComponentProps): ReactNode {
  const t = useT();

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">{t('error.unexpected.title')}</h1>
      <button type="button" onClick={reset} className="mt-4 text-blue-700 underline">
        {t('error.unexpected.action')}
      </button>
    </section>
  );
}
