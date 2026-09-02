import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
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
  const [locale] = useState(() => detectLocale(navigator.languages));

  const isRestoring = useSessionStore((state) => state.isRestoring);

  useEffect(() => {
    connectSessionToApi();
    void restoreSession();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider locale={locale}>
        {isRestoring ? <Restoring /> : <Routes queryClient={queryClient} />}
        <UpdatePrompt />
      </I18nProvider>
    </QueryClientProvider>
  );
}

/**
 * Маршруты. Заводятся **после** восстановления сессии, а не до.
 *
 * Охрана оболочки `_app` читает сессию из контекста роутера в `beforeLoad`.
 * Контекст, доставленный после создания роутера, до первого сопоставления
 * не доходит: прямая ссылка на кабинет выбрасывала вошедшего человека на
 * вход, и увидеть это можно было только открыв адрес ссылкой, а не переходом
 * внутри приложения.
 */
function Routes({ queryClient }: { readonly queryClient: QueryClient }): ReactNode {
  const user = useSessionStore((state) => state.user);
  const [router] = useState(() => createAppRouter({ queryClient, session: user }));

  useEffect(() => {
    // Вход и выход происходят уже при живом роутере. Без сброса вычисленных
    // совпадений они не отразятся на текущей странице до перезагрузки.
    void router.invalidate();
  }, [router, user]);

  return <RouterProvider router={router} context={{ queryClient, session: user }} />;
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
