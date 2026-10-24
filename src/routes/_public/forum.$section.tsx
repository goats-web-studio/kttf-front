import { FORUM_SECTION_SLUG_PATTERN, type ListForumTopicsQuery } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { PenLine } from 'lucide-react';
import { useCallback, type ReactNode } from 'react';
import { z } from 'zod';

import { useT } from '@/common/i18n';
import { orUndefined, searchPage, searchText } from '@/common/search';
import EmptyState from '@/common/ui/empty-state';
import PageHeader from '@/common/ui/page-header';
import Pagination from '@/common/ui/pagination';
import PillTabs from '@/common/ui/pill-tabs';
import QueryState from '@/common/ui/query-state';
import SearchInput from '@/common/ui/search-input';
import { RowsSkeleton } from '@/common/ui/skeleton';
import Surface from '@/common/ui/surface';
import { FORUM_HREF, newTopicHref } from '@/features/forum/labels';
import { forumSectionsQuery, forumTopicsQuery } from '@/features/forum/queries';
import TopicRow from '@/features/forum/topic-row';

const searchSchema = z.object({
  q: searchText,
  sort: z.enum(['NEW']).optional().catch(undefined),
  page: searchPage,
});

type Search = z.infer<typeof searchSchema>;

export const Route = createFileRoute('/_public/forum/$section')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: SectionPage,
});

/**
 * Раздел форума — `docs/12` 5. Закреплённые темы сверху, потом по последнему
 * ответу; переключатель «Новые» — по дате создания. Поиск по заголовкам.
 * Фильтры в адресе: ссылку на поиск пересылают в чат.
 */
function SectionPage(): ReactNode {
  const t = useT();
  const { section: slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const sections = useQuery(forumSectionsQuery);
  const section = sections.data?.find((item) => item.slug === slug);
  const valid = FORUM_SECTION_SLUG_PATTERN.test(slug);
  const page = search.page ?? 1;
  const query: Partial<ListForumTopicsQuery> = {
    section: slug,
    page,
    ...(search.q === undefined ? {} : { q: search.q }),
    ...(search.sort === undefined ? {} : { sort: search.sort }),
  };
  const topics = useQuery({ ...forumTopicsQuery(query), enabled: valid });

  const filter = useCallback(
    (patch: Partial<Search>, replace = false) => {
      void navigate({
        search: (previous) => ({ ...previous, ...patch, page: undefined }),
        replace,
      });
    },
    [navigate],
  );
  const commitQ = useCallback(
    (value: string) => {
      filter({ q: orUndefined(value) }, true);
    },
    [filter],
  );

  if (sections.data !== undefined && section === undefined) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 5, sm: 6 } }}>
        <EmptyState
          title={t('forum.section.notFound')}
          action={<Button href={FORUM_HREF}>{t('page.forum.title')}</Button>}
        />
      </Container>
    );
  }

  const pages =
    topics.data === undefined ? 1 : Math.max(1, Math.ceil(topics.data.total / topics.data.limit));

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <PageHeader
        back={{ href: FORUM_HREF, label: t('page.forum.title') }}
        title={section?.title ?? ' '}
        {...(section?.description === null || section === undefined
          ? {}
          : { subtitle: section.description })}
        // В «Новостях клубов и тренеров» тема — сама новость (ADR-067 §2):
        // её публикуют клуб или тренер на своей странице.
        {...(section?.manualTopics === false
          ? {}
          : {
              actions: (
                <Button
                  href={newTopicHref(slug)}
                  variant="contained"
                  startIcon={<PenLine size={18} aria-hidden />}
                  sx={{ minHeight: 44 }}
                >
                  {t('forum.newTopic')}
                </Button>
              ),
            })}
      />
      {section?.manualTopics === false && (
        <Typography color="text.secondary" sx={{ mt: -2, mb: 3 }} data-forum-news-hint>
          {t('forum.news.hint')}
        </Typography>
      )}

      <Box
        role="search"
        sx={{
          mb: 2,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ flex: '1 1 320px', maxWidth: 480 }}>
          <SearchInput label={t('forum.search')} value={search.q} onCommit={commitQ} />
        </Box>
        <PillTabs
          label={t('forum.sort.label')}
          value={search.sort ?? 'ACTIVE'}
          options={[
            ['ACTIVE', 'forum.sort.ACTIVE'],
            ['NEW', 'forum.sort.NEW'],
          ]}
          onChange={(value) => {
            filter({ sort: value === 'NEW' ? 'NEW' : undefined });
          }}
        />
      </Box>

      <QueryState
        isPending={topics.isPending}
        error={topics.error}
        onRetry={() => void topics.refetch()}
        loading={<RowsSkeleton />}
      >
        {topics.data?.items.length === 0 ? (
          <EmptyState
            title={search.q === undefined ? t('forum.section.empty') : t('forum.search.empty')}
            action={
              <Button href={newTopicHref(slug)} variant="contained" sx={{ minHeight: 44 }}>
                {t('forum.newTopic')}
              </Button>
            }
          />
        ) : (
          <Surface flush>
            <Box component="ul" sx={{ m: 0, p: 0 }} data-forum-topics>
              {topics.data?.items.map((topic) => (
                <TopicRow key={topic.id} topic={topic} />
              ))}
            </Box>
          </Surface>
        )}
      </QueryState>

      <Pagination
        page={page}
        pages={pages}
        onPage={(next) => {
          void navigate({
            search: (previous) => ({ ...previous, page: next > 1 ? next : undefined }),
          });
        }}
      />
    </Container>
  );
}
