import {
  LEGAL_LANGUAGES,
  LEGAL_PATHS,
  type LegalDocument,
  type LegalLanguage,
} from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from '@tanstack/react-router';
import { useEffect, type ReactNode } from 'react';

import { LOCALE_NAMES, fill, useLocale, useT } from '@/common/i18n';
import PageHeader from '@/common/ui/page-header';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import Surface from '@/common/ui/surface';

import { resolveLegalLanguage } from './language';
import LegalArticle from './legal-article';
import { parseLegal } from './legal-markdown';
import { LEGAL_CONTACT_EMAIL, OPERATOR_BLOCK } from './operator';
import { loadLegalText } from './texts';

interface LegalPageProps {
  readonly doc: LegalDocument;
  /** Язык из адреса (`?lang=`) — ссылка на конкретный перевод. */
  readonly lang?: LegalLanguage | undefined;
}

/**
 * Страница документа — политика конфиденциальности или соглашение (ADR-091).
 * Открыта без входа: её читают до регистрации и проверяют сторы приложений.
 */
export default function LegalPage({ doc, lang: override }: LegalPageProps): ReactNode {
  const t = useT();
  const locale = useLocale();
  const { lang, note } = resolveLegalLanguage(locale, override);
  const location = useLocation();

  const text = useQuery({
    queryKey: ['legal', doc, lang],
    queryFn: () => loadLegalText(doc, lang),
    staleTime: Infinity,
  });
  const parsed =
    text.data === undefined
      ? null
      : parseLegal(text.data, OPERATOR_BLOCK[lang], LEGAL_CONTACT_EMAIL);

  // Ссылка на раздел (`/privacy#account-deletion`) — после того, как текст
  // появился: до загрузки раздела на странице нет.
  const hash = location.hash.replace(/^#/, '');
  const ready = parsed !== null;
  useEffect(() => {
    if (ready && hash !== '') {
      document.getElementById(hash)?.scrollIntoView();
    }
  }, [ready, hash]);

  return (
    <Container maxWidth="md" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <PageHeader
        title={parsed?.title ?? t(doc === 'privacy' ? 'footer.privacy' : 'footer.terms')}
        subtitle={
          parsed?.version == null ? undefined : fill(t('legal.version'), { date: parsed.version })
        }
      />

      <Box
        component="nav"
        aria-label={t('legal.languages')}
        sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}
      >
        {LEGAL_LANGUAGES.map((option) => (
          <Link
            key={option}
            href={`${LEGAL_PATHS[doc]}?lang=${option}`}
            aria-current={option === lang ? 'true' : undefined}
            sx={{ fontWeight: option === lang ? 700 : 400, minHeight: 32 }}
          >
            {LOCALE_NAMES[option]}
          </Link>
        ))}
      </Box>

      {note !== null && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t(note === 'translation' ? 'legal.note.translation' : 'legal.note.fallback')}
        </Alert>
      )}

      <Surface>
        <QueryState
          isPending={text.isPending}
          error={text.error}
          loading={<RowsSkeleton rows={8} />}
        >
          {parsed !== null && <LegalArticle blocks={parsed.blocks} />}
        </QueryState>
      </Surface>
    </Container>
  );
}
