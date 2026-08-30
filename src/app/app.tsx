import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { type ReactNode, useEffect, useState } from 'react';

import { detectLocale, I18nProvider, useT } from '@/common/i18n';
import { connectSessionToApi, restoreSession } from '@/features/auth/session';
import { useSessionStore } from '@/features/auth/session-store';

import { createQueryClient } from './query-client';
import { createAppRouter } from './router';
import UpdatePrompt from './update-prompt';

export default function App(): ReactNode {
  const [queryClient] = useState(createQueryClient);
  const [router] = useState(() => createAppRouter({ queryClient, session: null }));
  const [locale] = useState(() => detectLocale(navigator.languages));

  const user = useSessionStore((state) => state.user);
  const isRestoring = useSessionStore((state) => state.isRestoring);

  useEffect(() => {
    connectSessionToApi();
    void restoreSession();
  }, []);

  useEffect(() => {
    // Охрана маршрутов читает сессию из контекста в beforeLoad. Без сброса
    // уже вычисленных совпадений вход и выход не отразятся на текущей
    // странице до перезагрузки.
    void router.invalidate();
  }, [router, user]);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider locale={locale}>
        {isRestoring ? (
          <Restoring />
        ) : (
          <RouterProvider router={router} context={{ queryClient, session: user }} />
        )}
        <UpdatePrompt />
      </I18nProvider>
    </QueryClientProvider>
  );
}

/**
 * Пока сессия восстанавливается, маршруты не показываются.
 *
 * Иначе перезагрузка страницы кабинета успевает выбросить на вход раньше,
 * чем обновится токен, — человек видит форму входа, будучи вошедшим.
 */
function Restoring(): ReactNode {
  const t = useT();

  return (
    <div className="flex h-full items-center justify-center text-slate-500">
      {t('common.loading')}
    </div>
  );
}
