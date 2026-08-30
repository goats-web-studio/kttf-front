import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import PagePlaceholder from '@/common/ui/page-placeholder';

export const Route = createFileRoute('/_public/players/$playerId')({
  component: PlayerPage,
});

function PlayerPage(): ReactNode {
  const t = useT();
  // Параметр типизирован деревом маршрутов: опечатка в имени не соберётся.
  const { playerId } = Route.useParams();

  return (
    <PagePlaceholder title={t('page.player.title')}>
      <p className="mt-4 font-mono text-sm text-slate-400">{playerId}</p>
    </PagePlaceholder>
  );
}
