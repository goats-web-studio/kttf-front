import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import PagePlaceholder from '@/common/ui/page-placeholder';

export const Route = createFileRoute('/_app/cabinet')({
  component: CabinetPage,
});

function CabinetPage(): ReactNode {
  const t = useT();

  return <PagePlaceholder title={t('page.cabinet.title')} />;
}
