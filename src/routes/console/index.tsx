import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

export const Route = createFileRoute('/console/')({
  component: ConsolePage,
});

function ConsolePage(): ReactNode {
  const t = useT();

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">{t('page.console.title')}</h1>
      <p className="mt-2 text-slate-300">{t('common.soon')}</p>
    </section>
  );
}
