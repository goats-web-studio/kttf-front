import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import PagePlaceholder from '@/common/ui/page-placeholder';

export const Route = createFileRoute('/_public/tournaments')({
  component: TournamentsPage,
});

function TournamentsPage(): ReactNode {
  const t = useT();

  return <PagePlaceholder title={t('page.tournaments.title')} />;
}
