import type { ForumSectionView, ForumTopicItem, ListForumTopicsQuery } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { Lock, MessagesSquare, PenLine, Pin } from 'lucide-react';
import { type ReactNode } from 'react';

import { fill, formatCount, formatDateTime, useLocale, useT } from '@/common/i18n';
import EmptyState from '@/common/ui/empty-state';
import PageHeader from '@/common/ui/page-header';
import Pagination from '@/common/ui/pagination';
import PillTabs from '@/common/ui/pill-tabs';
import PlayerAvatar from '@/common/ui/player-avatar';
import QueryState from '@/common/ui/query-state';
import SearchInput from '@/common/ui/search-input';
import { RowsSkeleton } from '@/common/ui/skeleton';
import Surface from '@/common/ui/surface';

import {
  FORUM_HREF,
  newTopicHref,
  sectionHref,
  splitName,
  SUBJECT_KEYS,
  topicHref,
} from './labels';
import { forumSectionsQuery, forumTopicsQuery } from './queries';
import { Birthdays, OnlineAndLinks } from './sidebar';

export interface BoardSearch {
  readonly q?: string | undefined;
  readonly sort?: 'NEW' | undefined;
  readonly page?: number | undefined;
}

interface ForumBoardProps {
  /** Раздел из адреса; без него — лента всех разделов. */
  readonly slug?: string;
  /** Сам раздел — для заголовка; приходит, когда загрузится список разделов. */
  readonly section?: ForumSectionView;
  readonly search: BoardSearch;
  readonly onSearch: (patch: BoardSearch, replace?: boolean) => void;
  readonly onPage: (page: number) => void;
}

/**
 * Форум по классике Discourse и Flarum: слева — «Новая тема» и разделы,
 * в центре — лента обсуждений, свежие наверху. Раздел открывается в той же
 * раскладке: слева он подсвечен, в центре — только его темы.
 *
 * На телефоне разделы — лентой фишек над списком, блоки «на сайте» и
 * дни рождения уходят под список.
 */
export default function ForumBoard({
  slug,
  section,
  search,
  onSearch,
  onPage,
}: ForumBoardProps): ReactNode {
  const t = useT();
  const sections = useQuery(forumSectionsQuery);
  const page = search.page ?? 1;
  const query: Partial<ListForumTopicsQuery> = {
    page,
    ...(slug === undefined ? {} : { section: slug }),
    ...(search.q === undefined ? {} : { q: search.q }),
    ...(search.sort === undefined ? {} : { sort: search.sort }),
  };
  const topics = useQuery(forumTopicsQuery(query));
  const pages =
    topics.data === undefined ? 1 : Math.max(1, Math.ceil(topics.data.total / topics.data.limit));
  // В «Новостях клубов и тренеров» тему публикуют клуб или тренер (ADR-067 §2).
  const canPost = section?.manualTopics !== false;
  const newHref = slug === undefined || !canPost ? newTopicHref() : newTopicHref(slug);

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 4, sm: 6 } }}>
      <Box
        sx={{
          display: 'grid',
          gap: { xs: 2, md: 4 },
          gridTemplateColumns: { xs: '1fr', md: '240px minmax(0, 1fr)' },
          alignItems: 'start',
        }}
      >
        <Box
          component="aside"
          sx={{
            display: 'grid',
            gap: 2,
            position: { md: 'sticky' },
            top: { md: 80 },
            minWidth: 0,
          }}
        >
          <Button
            href={newHref}
            variant="contained"
            size="large"
            startIcon={<PenLine size={18} aria-hidden />}
            sx={{ minHeight: 44 }}
          >
            {t('forum.newTopic')}
          </Button>
          <SectionNav sections={sections.data ?? []} active={slug} />
          <Box sx={{ display: { xs: 'none', md: 'grid' }, gap: 2 }}>
            <OnlineAndLinks />
            <Birthdays />
          </Box>
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <PageHeader
            title={slug === undefined ? t('page.forum.title') : (section?.title ?? ' ')}
            {...(slug === undefined
              ? { subtitle: t('forum.lead') }
              : section === undefined
                ? {}
                : section.description === null
                  ? {}
                  : { subtitle: section.description })}
          />
          {!canPost && (
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
            <PillTabs
              label={t('forum.sort.label')}
              value={search.sort ?? 'ACTIVE'}
              options={[
                ['ACTIVE', 'forum.sort.ACTIVE'],
                ['NEW', 'forum.sort.NEW'],
              ]}
              onChange={(value) => {
                onSearch({ sort: value === 'NEW' ? 'NEW' : undefined });
              }}
            />
            <Box sx={{ flex: '1 1 260px', maxWidth: 360 }}>
              <SearchInput
                label={t('forum.search')}
                value={search.q}
                onCommit={(value) => {
                  onSearch({ q: value.trim() === '' ? undefined : value }, true);
                }}
              />
            </Box>
          </Box>

          <QueryState
            isPending={topics.isPending}
            error={topics.error}
            onRetry={() => void topics.refetch()}
            loading={<RowsSkeleton />}
          >
            {topics.data?.items.length === 0 ? (
              <EmptyState
                title={
                  search.q !== undefined
                    ? t('forum.search.empty')
                    : slug === undefined
                      ? t('forum.empty.title')
                      : t('forum.section.empty')
                }
                {...(canPost
                  ? {
                      action: (
                        <Button href={newHref} variant="contained" sx={{ minHeight: 44 }}>
                          {t('forum.newTopic')}
                        </Button>
                      ),
                    }
                  : {})}
              />
            ) : (
              <Surface flush>
                <Box component="ul" sx={{ m: 0, p: 0 }} data-forum-topics>
                  {topics.data?.items.map((topic) => (
                    <BoardRow key={topic.id} topic={topic} showSection={slug === undefined} />
                  ))}
                </Box>
              </Surface>
            )}
          </QueryState>

          <Pagination page={page} pages={pages} onPage={onPage} />

          <Box sx={{ display: { xs: 'grid', md: 'none' }, gap: 2, mt: 4 }}>
            <OnlineAndLinks />
            <Birthdays />
          </Box>
        </Box>
      </Box>
    </Container>
  );
}

/**
 * Разделы. На широком экране — столбец со счётчиком тем, на телефоне —
 * прокручиваемая лента фишек: десяток строк выше списка тем отодвигал бы
 * сами обсуждения за первый экран.
 */
function SectionNav({
  sections,
  active,
}: {
  readonly sections: readonly ForumSectionView[];
  readonly active: string | undefined;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const items: readonly { href: string; label: string; count: number | null; current: boolean }[] =
    [
      { href: FORUM_HREF, label: t('forum.allTopics'), count: null, current: active === undefined },
      ...sections.map((section) => ({
        href: sectionHref(section.slug),
        label: section.title,
        count: section.topicsCount,
        current: section.slug === active,
      })),
    ];

  return (
    <Box component="nav" aria-label={t('forum.sections')} sx={{ minWidth: 0 }}>
      <Typography
        component="h2"
        sx={{
          display: { xs: 'none', md: 'block' },
          px: 1.5,
          mb: 0.5,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'text.secondary',
        }}
      >
        {t('forum.sections')}
      </Typography>
      <Box
        component="ul"
        sx={{
          m: 0,
          p: 0,
          display: 'flex',
          flexDirection: { xs: 'row', md: 'column' },
          gap: { xs: 1, md: 0.25 },
          overflowX: { xs: 'auto', md: 'visible' },
          scrollbarWidth: 'none',
          mx: { xs: -2, md: 0 },
          px: { xs: 2, md: 0 },
        }}
      >
        {items.map((item) => (
          <Box component="li" key={item.href} sx={{ listStyle: 'none', flexShrink: 0 }}>
            <Link
              href={item.href}
              underline="none"
              aria-current={item.current ? 'page' : undefined}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                minHeight: 44,
                px: 1.5,
                borderRadius: { xs: 999, md: 1 },
                border: { xs: '1px solid var(--line)', md: 0 },
                whiteSpace: { xs: 'nowrap', md: 'normal' },
                fontWeight: item.current ? 600 : 500,
                color: item.current ? 'var(--red-600)' : 'text.primary',
                bgcolor: item.current
                  ? 'var(--red-50)'
                  : { xs: 'background.paper', md: 'transparent' },
                '@media (hover: hover)': {
                  '&:hover': { bgcolor: item.current ? 'var(--red-50)' : 'var(--ink-100)' },
                },
              }}
            >
              <Box component="span" sx={{ flex: 1, minWidth: 0 }}>
                {item.label}
              </Box>
              {item.count !== null && (
                <Box
                  component="span"
                  sx={{ fontSize: 13, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatCount(item.count, locale)}
                </Box>
              )}
            </Link>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/**
 * Строка ленты: аватар автора, заголовок, раздел и автор, справа — ответы и
 * последняя активность. Вся информация для решения «открыть или нет» — в
 * одной строке, как в Discourse.
 */
function BoardRow({
  topic,
  showSection,
}: {
  readonly topic: ForumTopicItem;
  readonly showSection: boolean;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const replies = Math.max(0, topic.postsCount - 1);
  const authorName = topic.subject?.owner?.name ?? topic.author?.name ?? t('forum.author.gone');
  const { lastName, firstName } = splitName(authorName);
  const unread = topic.unread !== null && topic.unread > 0 && topic.firstUnread !== null;

  return (
    <Box
      component="li"
      data-forum-topic={topic.id}
      sx={{
        listStyle: 'none',
        display: 'grid',
        gridTemplateColumns: { xs: '40px minmax(0, 1fr)', sm: '40px minmax(0, 1fr) 72px 140px' },
        columnGap: 2,
        alignItems: 'center',
        px: { xs: 2, sm: 2.5 },
        py: 1.75,
        borderTop: '1px solid var(--line)',
        '&:first-of-type': { borderTop: 0 },
      }}
    >
      <PlayerAvatar
        lastName={lastName}
        firstName={firstName}
        // У новости аватар — буквы клуба или тренера: фото автора поста было бы чужим.
        photoUrl={topic.subject?.owner == null ? (topic.author?.photoUrl ?? null) : null}
        size="sm"
      />

      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
          {topic.pinned && (
            <Box component="span" sx={{ display: 'inline-flex', color: 'var(--red-600)' }}>
              <Pin size={16} aria-label={t('forum.topic.pinned')} />
            </Box>
          )}
          {topic.locked && (
            <Box component="span" sx={{ display: 'inline-flex', color: 'text.secondary' }}>
              <Lock size={16} aria-label={t('forum.topic.locked')} />
            </Box>
          )}
          <Link
            href={topicHref(topic.id)}
            underline="hover"
            color="text.primary"
            sx={{ fontWeight: 600, fontSize: 17, lineHeight: '24px', overflowWrap: 'anywhere' }}
          >
            {topic.title}
          </Link>
        </Box>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.25, display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 1 }}
        >
          {showSection && (
            <Link
              href={sectionHref(topic.section.slug)}
              underline="none"
              sx={{
                px: 1,
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                lineHeight: '20px',
                color: 'var(--ink-700)',
                bgcolor: 'var(--line)',
              }}
            >
              {topic.section.title}
            </Link>
          )}
          {topic.subject !== null && <span>{t(SUBJECT_KEYS[topic.subject.type])}</span>}
          <span>{authorName}</span>
          {unread && (
            <Link
              href={topicHref(topic.id, topic.firstUnread ?? undefined)}
              underline="hover"
              sx={{ fontWeight: 600, color: 'var(--red-600)' }}
              data-forum-unread={topic.unread}
            >
              {fill(t('forum.topic.unread'), { count: String(topic.unread) })}
            </Link>
          )}
          {/* На телефоне ответы и время — в той же строке. */}
          <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
            {fill(t('forum.topic.replies'), { count: String(replies) })}
            {' · '}
            {formatDateTime(topic.lastPostAt, locale)}
          </Box>
        </Typography>
      </Box>

      <Box
        sx={{
          display: { xs: 'none', sm: 'flex' },
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.75,
          color: replies > 0 ? 'text.primary' : 'text.secondary',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}
        title={fill(t('forum.topic.replies'), { count: String(replies) })}
      >
        <MessagesSquare size={16} aria-hidden />
        {formatCount(replies, locale)}
      </Box>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'right', minWidth: 0 }}
      >
        <Link href={topicHref(topic.id, topic.postsCount)} color="inherit" underline="hover">
          {formatDateTime(topic.lastPostAt, locale)}
        </Link>
        {topic.lastAuthorName !== null && (
          <Box
            component="span"
            sx={{
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {topic.lastAuthorName}
          </Box>
        )}
      </Typography>
    </Box>
  );
}
