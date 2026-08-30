import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

export const Route = createFileRoute('/_public/')({
  component: HomePage,
});

function HomePage(): ReactNode {
  const t = useT();

  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold text-slate-900">{t('page.home.title')}</h1>
      <p className="mt-3 text-slate-600">{t('page.home.lead')}</p>
    </section>
  );
}
