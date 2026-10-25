import type { FeedTab } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { useT, type MessageKey } from '@/common/i18n';
import PillTabs from '@/common/ui/pill-tabs';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { useSessionStore } from '@/features/auth/session-store';

import FeedCard from './feed-card';
import { foldAchievements } from './labels';
import PostComposer from './post-composer';
import { feedQuery } from './queries';

const TABS: readonly (readonly [FeedTab, MessageKey])[] = [
  ['FOR_YOU', 'feed.tab.forYou'],
  ['FOLLOWING', 'feed.tab.following'],
  ['ALL', 'feed.tab.all'],
];

/**
 * Лента на главной — ADR-073. Под интересными блоками: второе по важности,
 * но то, ради чего возвращаются. Гостю — «Все» без вкладок и без формы:
 * подписок и своего города у него нет.
 */
export default function FeedSection(): ReactNode {
  const t = useT();
  const signedIn = useSessionStore((state) => state.user !== null);
  const [chosen, setChosen] = useState<FeedTab>('FOR_YOU');
  const tab: FeedTab = signedIn ? chosen : 'ALL';
  const feed = useInfiniteQuery(feedQuery(tab, signedIn));
  const items = feed.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <Stack spacing={2} data-home-feed>
      {signedIn && (
        <>
          <PillTabs value={tab} options={TABS} label={t('feed.title')} onChange={setChosen} />
          <PostComposer />
        </>
      )}

      {feed.isPending ? (
        <RowsSkeleton rows={4} />
      ) : items.length === 0 ? (
        <Box
          sx={{ p: 3, borderRadius: 3, bgcolor: 'var(--paper)', boxShadow: 'var(--shadow-card)' }}
        >
          <Typography color="text.secondary">
            {t(tab === 'FOLLOWING' ? 'feed.empty.following' : 'feed.empty')}
          </Typography>
        </Box>
      ) : (
        <Stack spacing={2} component="div">
          {foldAchievements(items).map((entry) => (
            <FeedCard key={entry.item.id} item={entry.item} also={entry.also} />
          ))}
        </Stack>
      )}

      {feed.hasNextPage && (
        <Button
          variant="outlined"
          onClick={() => void feed.fetchNextPage()}
          disabled={feed.isFetchingNextPage}
          sx={{ alignSelf: 'center', minHeight: 44, minWidth: 200 }}
        >
          {t(feed.isFetchingNextPage ? 'common.loading' : 'feed.more')}
        </Button>
      )}
    </Stack>
  );
}
