import {
  FORUM_SUBJECT_TYPES,
  type ForumPostItem,
  type ListForumFeedQuery,
} from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Heart } from 'lucide-react';
import { useCallback, type ReactNode } from 'react';
import { z } from 'zod';

import { fill, formatDateTime, useLocale, useT } from '@/common/i18n';
import { orUndefined, searchId, searchPage, searchText } from '@/common/search';
import EmptyState from '@/common/ui/empty-state';
import PageHeader from '@/common/ui/page-header';
import Pagination from '@/common/ui/pagination';
import PillTabs from '@/common/ui/pill-tabs';
import QueryState from '@/common/ui/query-state';
import SearchInput from '@/common/ui/search-input';
import { RowsSkeleton } from '@/common/ui/skeleton';
import Surface from '@/common/ui/surface';
import AuthorLine from '@/features/forum/author-line';
import { FORUM_HREF, SUBJECT_KEYS, topicHref } from '@/features/forum/labels';
import { forumFeedQuery, forumSectionsQuery } from '@/features/forum/queries';

const searchSchema = z.object({
  q: searchText,
  section: z.string().max(40).optional().catch(undefined),
  type: z.enum(FORUM_SUBJECT_TYPES).optional().catch(undefined),
  author: searchId,
  sort: z.enum(['OLD', 'TOP']).optional().catch(undefined),
  page: searchPage,
});

type Search = z.infer<typeof searchSchema>;

export const Route = createFileRoute('/_public/forum/feed')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: FeedPage,
});

/**
 * Лента сообщений — ADR-067 §5, как «Комментарии пользователей» у RTTF:
 * все сообщения форума и обсуждений на страницах турниров, клубов,
 * тренеров и товаров. Фильтры — раздел, что обсуждают, текст; из профиля
 * приходят с `?author=` — все сообщения игрока. Фильтры в адресе.
 */
function FeedPage(): ReactNode {
  const t = useT();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const sections = useQuery(forumSectionsQuery);
  const page = search.page ?? 1;
  const query: Partial<ListForumFeedQuery> = {
    page,
    ...(search.q === undefined ? {} : { q: search.q }),
    ...(search.section === undefined ? {} : { section: search.section }),
    ...(search.type === undefined ? {} : { subjectType: search.type }),
    ...(search.author === undefined ? {} : { authorPlayerId: search.author }),
    ...(search.sort === undefined ? {} : { sort: search.sort }),
  };
  const feed = useQuery(forumFeedQuery(query));
  const author =
    search.author === undefined
      ? null
      : (feed.data?.items.find((item) => item.author?.playerId === search.author)?.author ?? null);

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
  const pages =
    feed.data === undefined ? 1 : Math.max(1, Math.ceil(feed.data.total / feed.data.limit));

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <PageHeader
        back={{ href: FORUM_HREF, label: t('page.forum.title') }}
        title={t('forum.feed.title')}
        subtitle={
          author === null
            ? t('forum.feed.lead')
            : fill(t('forum.feed.byAuthor'), { name: author.name })
        }
      />

      <Box
        role="search"
        sx={{
          mb: 2,
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr)' },
        }}
      >
        <SearchInput label={t('forum.feed.search')} value={search.q} onCommit={commitQ} />
        <TextField
          select
          label={t('forum.feed.section')}
          value={search.section ?? ''}
          onChange={(event) => {
            filter({ section: event.target.value === '' ? undefined : event.target.value });
          }}
        >
          <MenuItem value="" sx={{ minHeight: 44 }}>
            {t('forum.feed.all')}
          </MenuItem>
          {sections.data?.map((section) => (
            <MenuItem key={section.id} value={section.slug} sx={{ minHeight: 44 }}>
              {section.title}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label={t('forum.feed.type')}
          value={search.type ?? ''}
          onChange={(event) => {
            const value = FORUM_SUBJECT_TYPES.find((type) => type === event.target.value);

            filter({ type: value });
          }}
        >
          <MenuItem value="" sx={{ minHeight: 44 }}>
            {t('forum.feed.all')}
          </MenuItem>
          {FORUM_SUBJECT_TYPES.map((type) => (
            <MenuItem key={type} value={type} sx={{ minHeight: 44 }}>
              {t(SUBJECT_KEYS[type])}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <PillTabs
          label={t('forum.feed.sort')}
          value={search.sort ?? 'NEW'}
          options={[
            ['NEW', 'forum.replies.NEW'],
            ['OLD', 'forum.replies.OLD'],
            ['TOP', 'forum.replies.TOP'],
          ]}
          onChange={(value) => {
            filter({ sort: value === 'NEW' ? undefined : value });
          }}
        />
      </Box>

      <QueryState
        isPending={feed.isPending}
        error={feed.error}
        onRetry={() => void feed.refetch()}
        loading={<RowsSkeleton />}
      >
        {feed.data?.items.length === 0 ? (
          <EmptyState title={t('forum.search.empty')} />
        ) : (
          <Surface flush>
            <Box component="ul" sx={{ m: 0, p: 0 }} data-forum-feed>
              {feed.data?.items.map((item) => (
                <FeedRow key={item.id} item={item} />
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
          window.scrollTo({ top: 0 });
        }}
      />
    </Container>
  );
}

function FeedRow({ item }: { readonly item: ForumPostItem }): ReactNode {
  const t = useT();
  const locale = useLocale();

  return (
    <Box
      component="li"
      sx={{
        listStyle: 'none',
        px: { xs: 2, sm: 2.5 },
        py: 2,
        borderTop: '1px solid var(--line)',
        '&:first-of-type': { borderTop: 0 },
      }}
    >
      <AuthorLine
        author={item.author}
        role={item.role}
        size="sm"
        meta={
          <Typography variant="body2" color="text.secondary">
            {formatDateTime(item.createdAt, locale)}
          </Typography>
        }
      />
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {item.subject === null ? item.section.title : t(SUBJECT_KEYS[item.subject.type])}
        {' · '}
        <Link
          href={topicHref(item.topic.id, item.number)}
          underline="hover"
          color="text.primary"
          sx={{ fontWeight: 600 }}
        >
          {item.topic.title}
        </Link>
      </Typography>
      <Typography sx={{ mt: 0.5, color: 'var(--ink-700)', overflowWrap: 'anywhere' }}>
        {item.excerpt}
      </Typography>
      {item.likes > 0 && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.5, display: 'inline-flex', gap: 0.5, alignItems: 'center' }}
        >
          <Heart size={14} aria-hidden />
          {item.likes}
        </Typography>
      )}
    </Box>
  );
}
