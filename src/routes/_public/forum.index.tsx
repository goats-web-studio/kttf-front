import type { ForumSectionView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { PenLine } from 'lucide-react';
import type { ReactNode } from 'react';

import { fill, formatCount, formatDateTime, useLocale, useT } from '@/common/i18n';
import EmptyState from '@/common/ui/empty-state';
import PageHeader from '@/common/ui/page-header';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import Surface from '@/common/ui/surface';
import { newTopicHref, sectionHref, topicHref } from '@/features/forum/labels';
import { forumSectionsQuery, forumTopicsQuery } from '@/features/forum/queries';

export const Route = createFileRoute('/_public/forum/')({
  component: ForumPage,
});

/** Сколько тем в «Обсуждают сейчас». */
const ACTIVE_TOPICS = 8;

/**
 * Форум — ADR-064, `docs/12` 5. Разделы со счётчиками и последней темой,
 * рядом — «Обсуждают сейчас»: темы всех разделов по последнему ответу.
 */
function ForumPage(): ReactNode {
  const t = useT();
  const sections = useQuery(forumSectionsQuery);
  const active = useQuery(forumTopicsQuery({ limit: ACTIVE_TOPICS }));

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <PageHeader
        title={t('page.forum.title')}
        subtitle={t('forum.lead')}
        actions={
          <Button
            href={newTopicHref()}
            variant="contained"
            startIcon={<PenLine size={18} aria-hidden />}
            sx={{ minHeight: 44 }}
          >
            {t('forum.newTopic')}
          </Button>
        }
      />

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 8fr) minmax(0, 4fr)' },
          alignItems: 'start',
        }}
      >
        <Surface title={t('forum.sections')} flush component="section">
          <QueryState
            isPending={sections.isPending}
            error={sections.error}
            onRetry={() => void sections.refetch()}
            loading={<RowsSkeleton rows={7} />}
          >
            <Box component="ul" sx={{ m: 0, p: 0 }} data-forum-sections>
              {sections.data?.map((section) => (
                <SectionRow key={section.id} section={section} />
              ))}
            </Box>
          </QueryState>
        </Surface>

        <Surface title={t('forum.active')} flush component="section">
          <QueryState
            isPending={active.isPending}
            error={active.error}
            onRetry={() => void active.refetch()}
            loading={<RowsSkeleton rows={4} />}
          >
            {active.data?.items.length === 0 ? (
              <Box sx={{ p: 2 }}>
                <EmptyState title={t('forum.empty.title')} text={t('forum.empty.text')} />
              </Box>
            ) : (
              <Box component="ul" sx={{ m: 0, p: 0 }} data-forum-active>
                {active.data?.items.map((topic) => (
                  <Box
                    component="li"
                    key={topic.id}
                    sx={{
                      listStyle: 'none',
                      px: 2.5,
                      py: 1.5,
                      borderTop: '1px solid var(--line)',
                      '&:first-of-type': { borderTop: 0 },
                    }}
                  >
                    <Link
                      href={topicHref(topic.id)}
                      underline="hover"
                      color="text.primary"
                      sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}
                    >
                      {topic.title}
                    </Link>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                      {topic.section.title}
                      {' · '}
                      {fill(t('forum.topic.replies'), {
                        count: String(Math.max(0, topic.postsCount - 1)),
                      })}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </QueryState>
        </Surface>
      </Box>
    </Container>
  );
}

function SectionRow({ section }: { readonly section: ForumSectionView }): ReactNode {
  const t = useT();
  const locale = useLocale();

  return (
    <Box
      component="li"
      data-forum-section={section.slug}
      sx={{
        listStyle: 'none',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) 260px' },
        gap: { xs: 1, sm: 3 },
        px: { xs: 2, sm: 2.5 },
        py: 2,
        borderTop: '1px solid var(--line)',
        '&:first-of-type': { borderTop: 0 },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Link
          href={sectionHref(section.slug)}
          underline="hover"
          color="text.primary"
          sx={{ fontWeight: 600, fontSize: 18, lineHeight: '24px' }}
        >
          {section.title}
        </Link>
        {section.description !== null && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {section.description}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {fill(t('forum.section.counts'), {
            topics: formatCount(section.topicsCount, locale),
            posts: formatCount(section.postsCount, locale),
          })}
        </Typography>
      </Box>
      <Box sx={{ minWidth: 0 }}>
        {section.last === null ? (
          <Typography variant="body2" color="text.secondary">
            {t('forum.section.noTopics')}
          </Typography>
        ) : (
          <>
            <Link
              href={topicHref(section.last.topicId)}
              underline="hover"
              color="text.primary"
              variant="body2"
              sx={{
                fontWeight: 500,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {section.last.topicTitle}
            </Link>
            <Typography variant="body2" color="text.secondary">
              {formatDateTime(section.last.at, locale)}
              {section.last.authorName !== null && ` · ${section.last.authorName}`}
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
}
