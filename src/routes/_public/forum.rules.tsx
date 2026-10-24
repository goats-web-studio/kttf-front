import { FORUM_RULES } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useT, type MessageKey } from '@/common/i18n';
import PageHeader from '@/common/ui/page-header';
import Surface from '@/common/ui/surface';
import { FORUM_HREF, RULE_KEYS } from '@/features/forum/labels';

export const Route = createFileRoute('/_public/forum/rules')({
  component: RulesPage,
});

/** Пояснение к каждому пункту. «Другое» — без пояснения: оно у модератора в тексте. */
const RULE_TEXT_KEYS: Readonly<Record<(typeof FORUM_RULES)[number], MessageKey | null>> = {
  ABUSE: 'forum.rules.ABUSE',
  FLOOD: 'forum.rules.FLOOD',
  ADS: 'forum.rules.ADS',
  DUPLICATE: 'forum.rules.DUPLICATE',
  OFFTOPIC: 'forum.rules.OFFTOPIC',
  OTHER: null,
};

/**
 * «Правила общения» — ADR-067 §8. Как у RTTF, но коротко: пункты, на
 * которые ссылается модератор, и что бывает за нарушение. Санкции видны —
 * скрытое сообщение остаётся заглушкой с причиной (ADR-064 §5).
 */
function RulesPage(): ReactNode {
  const t = useT();

  return (
    <Container maxWidth="md" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <PageHeader
        back={{ href: FORUM_HREF, label: t('page.forum.title') }}
        title={t('forum.rules.title')}
        subtitle={t('forum.rules.lead')}
      />
      <Surface>
        <Box component="ol" sx={{ m: 0, pl: 3, display: 'grid', gap: 2 }} data-forum-rules>
          {FORUM_RULES.map((rule) => {
            const text = RULE_TEXT_KEYS[rule];

            return text === null ? null : (
              <Box component="li" key={rule}>
                <Typography sx={{ fontWeight: 600 }}>{t(RULE_KEYS[rule])}</Typography>
                <Typography color="text.secondary">{t(text)}</Typography>
              </Box>
            );
          })}
        </Box>
      </Surface>
      <Box sx={{ mt: 3 }} />
      <Surface title={t('forum.rules.sanctionsTitle')} component="section">
        <Box component="ul" sx={{ m: 0, pl: 3, display: 'grid', gap: 1 }}>
          {(
            [
              'forum.rules.sanction.hide',
              'forum.rules.sanction.warn',
              'forum.rules.sanction.mute',
              'forum.rules.sanction.report',
            ] as const
          ).map((key) => (
            <Typography component="li" key={key}>
              {t(key)}
            </Typography>
          ))}
        </Box>
      </Surface>
    </Container>
  );
}
