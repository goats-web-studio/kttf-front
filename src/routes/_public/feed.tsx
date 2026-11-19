import { feedFilterSchema, feedTabSchema, type FeedFilter, type FeedTab } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useInfiniteQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Fragment, type ReactNode } from 'react';
import { z } from 'zod';

import { useT, type MessageKey } from '@/common/i18n';
import EmptyState from '@/common/ui/empty-state';
import PageHeader from '@/common/ui/page-header';
import PillTabs from '@/common/ui/pill-tabs';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { useSessionStore } from '@/features/auth/session-store';
import FeedCard from '@/features/feed/feed-card';
import { FeedFilterChips, FeedSideNav } from '@/features/feed/feed-filter-nav';
import { DEFAULT_FEED_TAB, FEED_FILTER_OPTIONS, feedHref } from '@/features/feed/filters';
import ForumHot from '@/features/feed/forum-hot';
import { foldAchievements } from '@/features/feed/labels';
import PostComposer from '@/features/feed/post-composer';
import { feedQuery } from '@/features/feed/queries';
import FollowSuggestions from '@/features/follows/suggestions';
import { UpcomingShort } from '@/features/home/tournament-rail';

/** Вкладка и фильтр — в адресе (ADR-097): ссылку «новости клубов» пересылают. */
const searchSchema = z.object({
  tab: feedTabSchema.optional().catch(undefined),
  filter: feedFilterSchema.optional().catch(undefined),
});

type Search = z.infer<typeof searchSchema>;

export const Route = createFileRoute('/_public/feed')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: FeedPage,
});

const TABS: readonly (readonly [FeedTab, MessageKey])[] = [
  ['FOR_YOU', 'feed.tab.forYou'],
  ['FOLLOWING', 'feed.tab.following'],
  ['ALL', 'feed.tab.all'],
];

/** После какой карточки на телефоне встаёт блок рекомендаций. */
const INLINE_AFTER = 3;

/**
 * Страница «Лента» — ADR-097.
 *
 * Компьютер (от 1200px) — три колонки: слева вкладки и «Что показывать»,
 * липкие под шапкой; в центре «Что нового?» и лента; справа «На кого
 * подписаться», «Обсуждают на форуме» и ближайшие турниры. Планшет — левая
 * колонка сворачивается в чипы над лентой, правая остаётся. Телефон — одна
 * колонка: вкладки, чипы, лента; рекомендации — блоком после третьей
 * карточки.
 *
 * Гостю — «Все» без вкладок и без формы: подписок и своего у него нет.
 */
function FeedPage(): ReactNode {
  const t = useT();
  const theme = useTheme();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const signedIn = useSessionStore((state) => state.user !== null);
  // С 900px правая колонка рядом с лентой, с 1200px — и левая.
  const wide = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });
  const desk = useMediaQuery(theme.breakpoints.up('lg'), { noSsr: true });

  const tab: FeedTab = signedIn ? (search.tab ?? DEFAULT_FEED_TAB) : 'ALL';
  const filter = search.filter;
  const urlTab = signedIn ? search.tab : undefined;

  const setSearch = (patch: Partial<Search>) => {
    void navigate({ search: (previous) => ({ ...previous, ...patch }) });
  };

  // Записи пишут во «Всё» и «Игроки»: под «Турнирами» форма была бы не к месту.
  const composer = filter === undefined || filter === 'PLAYERS';
  const side = (
    <>
      {signedIn && <FollowSuggestions />}
      {/* Под фильтром «Форум» блок повторял бы саму ленту. */}
      {filter !== 'FORUM' && <ForumHot />}
      <UpcomingShort />
    </>
  );
  const inline = signedIn ? <FollowSuggestions /> : filter !== 'FORUM' && <ForumHot />;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 6 } }}>
      <PageHeader title={t('feed.title')} />

      <Box
        data-feed-page
        sx={{
          display: 'grid',
          gap: 3,
          alignItems: 'start',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            md: 'minmax(0, 1fr) 300px',
            lg: '240px minmax(0, 1fr) 300px',
          },
        }}
      >
        {desk && (
          <Box
            component="aside"
            sx={{ position: 'sticky', top: 88, minWidth: 0 }}
            data-feed-side="left"
          >
            <FeedSideNav tab={urlTab} filter={filter} signedIn={signedIn} />
          </Box>
        )}

        <Stack spacing={2} sx={{ minWidth: 0 }}>
          {!desk && signedIn && (
            <PillTabs
              value={tab}
              options={TABS}
              label={t('feed.tabs')}
              onChange={(next) => {
                setSearch({ tab: next === DEFAULT_FEED_TAB ? undefined : next });
              }}
            />
          )}
          {!desk && <FeedFilterChips tab={urlTab} filter={filter} />}
          {signedIn ? composer && <PostComposer /> : <GuestHint />}
          <FeedList
            tab={tab}
            signedIn={signedIn}
            filter={filter}
            inline={wide ? undefined : inline}
          />
        </Stack>

        {wide && (
          <Box
            component="aside"
            aria-label={t('feed.side')}
            data-feed-side="right"
            sx={{ display: 'grid', gap: 3, alignContent: 'start', minWidth: 0 }}
          >
            {side}
          </Box>
        )}
      </Box>
    </Container>
  );
}

/** Гостю — тихое приглашение войти вместо формы записи. */
function GuestHint(): ReactNode {
  const t = useT();

  return (
    <Paper
      variant="outlined"
      data-feed-guest
      sx={{
        px: 2.5,
        py: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        flexWrap: 'wrap',
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 0, flex: '1 1 240px' }}>
        {t('feed.guest.text')}
      </Typography>
      <Button href="/login" variant="text" sx={{ minHeight: 44, flexShrink: 0 }}>
        {t('feed.guest.action')}
      </Button>
    </Paper>
  );
}

function FeedList({
  tab,
  signedIn,
  filter,
  inline,
}: {
  readonly tab: FeedTab;
  readonly signedIn: boolean;
  readonly filter: FeedFilter | undefined;
  /** Блок посреди ленты — на телефоне, где правой колонки нет. */
  readonly inline: ReactNode;
}): ReactNode {
  const t = useT();
  const feed = useInfiniteQuery(feedQuery(tab, signedIn, filter));
  const entries = foldAchievements(feed.data?.pages.flatMap((page) => page.items) ?? []);
  const option = FEED_FILTER_OPTIONS.find((item) => item.value === filter);
  const empty: MessageKey =
    filter === undefined && tab === 'FOLLOWING'
      ? 'feed.empty.following'
      : (option?.empty ?? 'feed.empty');
  const at = Math.min(INLINE_AFTER, entries.length);

  return (
    <QueryState
      isPending={feed.isPending}
      // Отказ на «Показать ещё» не стирает уже прочитанное.
      error={feed.data === undefined ? feed.error : null}
      onRetry={() => void feed.refetch()}
      loading={<RowsSkeleton rows={4} />}
    >
      {entries.length === 0 ? (
        <EmptyState
          title={t(empty)}
          action={
            filter === undefined ? undefined : (
              <Button href={feedHref(signedIn ? tab : undefined, undefined)} sx={{ minHeight: 44 }}>
                {t('feed.filter.reset')}
              </Button>
            )
          }
        />
      ) : (
        <Stack spacing={2} data-feed-list>
          {entries.map((entry, index) => (
            <Fragment key={entry.item.id}>
              <FeedCard item={entry.item} also={entry.also} />
              {index + 1 === at && inline}
            </Fragment>
          ))}
        </Stack>
      )}

      {feed.hasNextPage && (
        <Button
          variant="outlined"
          onClick={() => void feed.fetchNextPage()}
          disabled={feed.isFetchingNextPage}
          // Кнопка — в колонке ленты рядом со списком: отступ даёт её `Stack`.
          sx={{ alignSelf: 'center', minHeight: 44, minWidth: 200 }}
        >
          {t(feed.isFetchingNextPage ? 'common.loading' : 'feed.more')}
        </Button>
      )}
    </QueryState>
  );
}
