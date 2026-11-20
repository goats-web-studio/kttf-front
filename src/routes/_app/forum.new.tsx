import {
  FEED_PORTAL_SECTION,
  FEED_POSTS_SECTION,
  FORUM_TOPIC_TITLE_MAX,
  type ForumAuthoredAs,
} from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';
import { z } from 'zod';

import { useLocale, useT } from '@/common/i18n';
import PageHeader from '@/common/ui/page-header';
import Surface from '@/common/ui/surface';
import { useSessionStore } from '@/features/auth/session-store';
import { createForumTopic } from '@/features/forum/api';
import Composer, { WriteGate } from '@/features/forum/composer';
import { FORUM_HREF, sectionHref, topicHref } from '@/features/forum/labels';
import { NewsLocaleField } from '@/features/forum/news-versions';
import { forumKeys, forumSectionsQuery } from '@/features/forum/queries';
import { VoicePicker } from '@/features/forum/voice';

const searchSchema = z.object({
  section: z.string().max(40).optional().catch(undefined),
});

export const Route = createFileRoute('/_app/forum/new')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: NewTopicPage,
});

/**
 * Новая тема — `docs/12` 5: раздел, заголовок, первое сообщение с фото.
 * Раздел приходит из адреса, если человек нажал «Новая тема» в разделе.
 */
function NewTopicPage(): ReactNode {
  const t = useT();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const sections = useQuery(forumSectionsQuery);
  const [sectionSlug, setSectionSlug] = useState(search.section ?? '');
  const [title, setTitle] = useState('');
  const [tried, setTried] = useState(false);
  const section = sections.data?.find((item) => item.slug === sectionSlug);
  const titleValid = title.trim().length >= 3;
  const isAdmin = useSessionStore((state) => state.user?.isAdmin === true);
  const uiLocale = useLocale();
  // Новость KTTF — у модератора: по умолчанию от KTTF, с языком оригинала
  // (ADR-098). Запись игрока — всегда своя.
  const news = section?.slug === FEED_PORTAL_SECTION;
  const canVoice = isAdmin && section !== undefined && section.slug !== FEED_POSTS_SECTION;
  const [voice, setVoice] = useState<ForumAuthoredAs | null>(null);
  const authoredAs = voice ?? (news ? 'KTTF' : 'SELF');
  const [newsLocale, setNewsLocale] = useState(uiLocale);

  return (
    <Container maxWidth="md" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <PageHeader
        back={
          section === undefined
            ? { href: FORUM_HREF, label: t('page.forum.title') }
            : { href: sectionHref(section.slug), label: section.title }
        }
        title={t('forum.newTopic')}
      />

      <WriteGate>
        <Surface>
          <Box sx={{ display: 'grid', gap: 2.5 }}>
            <TextField
              select
              label={t('forum.new.section')}
              value={section === undefined ? '' : sectionSlug}
              onChange={(event) => {
                setSectionSlug(event.target.value);
              }}
              required
              error={tried && section === undefined}
              sx={{ maxWidth: { sm: 360 } }}
              data-forum-new-section
            >
              {sections.data === undefined && (
                <MenuItem value="" disabled>
                  {t('common.loading')}
                </MenuItem>
              )}
              {sections.data
                ?.filter(
                  (item) => item.manualTopics || (isAdmin && item.slug === FEED_PORTAL_SECTION),
                )
                .map((item) => (
                  <MenuItem key={item.id} value={item.slug} sx={{ minHeight: 44 }}>
                    {item.title}
                  </MenuItem>
                ))}
            </TextField>
            <TextField
              label={t('forum.new.titleLabel')}
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
              }}
              required
              error={tried && !titleValid}
              helperText={
                tried && !titleValid ? t('forum.new.titleError') : t('forum.new.titleHint')
              }
              slotProps={{ htmlInput: { maxLength: FORUM_TOPIC_TITLE_MAX } }}
            />
            {news && <NewsLocaleField value={newsLocale} onChange={setNewsLocale} />}
            <Box>
              {canVoice && <VoicePicker value={authoredAs} onChange={setVoice} />}
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {t('forum.new.bodyHint')}
              </Typography>
              <Composer
                submitLabel={t('forum.new.submit')}
                validate={() => {
                  setTried(true);

                  return section !== undefined && titleValid;
                }}
                submit={async (input) => {
                  if (section === undefined) return;

                  const topic = await createForumTopic({
                    sectionId: section.id,
                    title: title.trim(),
                    body: input.body,
                    ...(input.images === undefined ? {} : { images: input.images }),
                    ...(canVoice ? { authoredAs } : {}),
                    ...(news ? { locale: newsLocale } : {}),
                  });

                  await queryClient.invalidateQueries({ queryKey: forumKeys.all });
                  await navigate({ href: topicHref(topic.id) });
                }}
              />
            </Box>
          </Box>
        </Surface>
      </WriteGate>
    </Container>
  );
}
