import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import PagePlaceholder from '@/common/ui/page-placeholder';

export const Route = createFileRoute('/_public/ratings')({
  component: RatingsPage,
});

function RatingsPage(): ReactNode {
  const t = useT();

  return <PagePlaceholder title={t('page.ratings.title')} />;
}
