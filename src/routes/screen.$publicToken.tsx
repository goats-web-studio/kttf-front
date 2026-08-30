import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

export const Route = createFileRoute('/screen/$publicToken')({
  component: ScreenPage,
});

/**
 * Второй экран зала — ТС 7.7, ТЗ 6.5.
 *
 * Без авторизации и без общей оболочки: это монитор на стене, а не страница
 * для человека с телефоном. Доступ даёт публичный токен в адресе.
 */
function ScreenPage(): ReactNode {
  const t = useT();
  const { publicToken } = Route.useParams();

  return (
    <section className="flex h-full flex-col items-center justify-center bg-black text-white">
      <h1 className="text-4xl font-semibold">{t('page.screen.title')}</h1>
      <p className="mt-4 font-mono text-sm text-slate-500">{publicToken}</p>
    </section>
  );
}
