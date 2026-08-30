import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { type ReactNode, useState } from 'react';

import { detectLocale, I18nProvider } from '@/common/i18n';

import { createQueryClient } from './query-client';
import { createAppRouter } from './router';
import UpdatePrompt from './update-prompt';

export default function App(): ReactNode {
  const [queryClient] = useState(createQueryClient);
  // Сессии пока нет: вход появится вместе с общими DTO (ОВ-10). До тех пор
  // охрана кабинета отрабатывает штатно и уводит на публичную часть.
  const [router] = useState(() => createAppRouter({ queryClient, session: null }));
  const [locale] = useState(() => detectLocale(navigator.languages));

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider locale={locale}>
        <RouterProvider router={router} />
        <UpdatePrompt />
      </I18nProvider>
    </QueryClientProvider>
  );
}
