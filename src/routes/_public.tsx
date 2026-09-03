import { createFileRoute, Link, Outlet } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import { useSessionStore } from '@/features/auth/session-store';

export const Route = createFileRoute('/_public')({
  component: PublicLayout,
});

/**
 * Оболочка публичной части: рейтинги, календарь, профили, результаты (ТЗ 9).
 *
 * Открыта без авторизации целиком — критерий готовности MVP требует, чтобы
 * страница результатов открывалась без входа.
 */
function PublicLayout(): ReactNode {
  const t = useT();
  const user = useSessionStore((state) => state.user);

  return (
    <div className="flex min-h-full flex-col bg-paper">
      <header className="border-b border-line">
        <nav className="mx-auto flex max-w-3xl items-center gap-6 px-4 py-4">
          <Link to="/" className="font-semibold text-ink-900">
            {t('app.name')}
          </Link>
          <Link to="/ratings" className="text-ink-700">
            {t('nav.ratings')}
          </Link>
          <Link to="/tournaments" className="text-ink-700">
            {t('nav.tournaments')}
          </Link>
          {user === null ? (
            <Link to="/login" className="ml-auto text-ink-700">
              {t('page.login.title')}
            </Link>
          ) : (
            <Link to="/cabinet" className="ml-auto text-ink-700">
              {t('page.cabinet.title')}
            </Link>
          )}
        </nav>
      </header>
      <main className="grow">
        <Outlet />
      </main>
      <footer className="border-t border-line px-4 py-6 text-center text-sm text-ink-500">
        {t('app.tagline')}
      </footer>
    </div>
  );
}
