import { LEGAL_LANGUAGES } from '@kttf/shared/types';
import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { z } from 'zod';

import LegalPage from '@/features/legal/legal-page';

// Неизвестный язык в адресе — просто язык интерфейса, а не ошибка.
const searchSchema = z.object({ lang: z.enum(LEGAL_LANGUAGES).optional().catch(undefined) });

/** Политика конфиденциальности — ADR-091. */
export const Route = createFileRoute('/_public/privacy')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: PrivacyPage,
});

function PrivacyPage(): ReactNode {
  const { lang } = Route.useSearch();

  return <LegalPage doc="privacy" lang={lang} />;
}
