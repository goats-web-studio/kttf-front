import type { FeedForumItem } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';
import type { ReactNode } from 'react';

import { formatCount, useLocale, useT } from '@/common/i18n';
import Surface from '@/common/ui/surface';
import { sectionHref, topicHref } from '@/features/forum/labels';

import { forumHotQuery } from './queries';
import { formatAgo } from './time';

/**
 * «Обсуждают на форуме» — колонка страницы «Лента» (ADR-097): несколько
 * живых тем строками — раздел, заголовок, ответы и когда писали последний
 * раз. Пусто — блока нет.
 */
export default function ForumHot(): ReactNode {
  const t = useT();
  const hot = useQuery(forumHotQuery);
  const items = (hot.data?.items ?? []).filter(
    (item): item is FeedForumItem => item.type === 'FORUM',
  );

  if (items.length === 0) return null;

  return (
    <Surface
      flush
      title={t('feed.hot.title')}
      action={
        <Link href="/forum" variant="body2" underline="hover" sx={{ whiteSpace: 'nowrap' }}>
          {t('home.forum.all')}
        </Link>
      }
    >
      <Box component="ul" sx={{ m: 0, p: 0 }} data-feed-hot>
        {items.map((item) => (
          <HotLine key={item.id} item={item} />
        ))}
      </Box>
    </Surface>
  );
}

function HotLine({ item }: { readonly item: FeedForumItem }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const href =
    item.discussion === null ? sectionHref(item.section.slug) : topicHref(item.discussion.topicId);

  return (
    <Box
      component="li"
      sx={{ listStyle: 'none', px: 2, py: 1.5, borderTop: '1px solid var(--line)', minWidth: 0 }}
    >
      <Typography variant="caption" color="text.secondary" component="p" noWrap>
        <Box component="span" sx={{ fontWeight: 700 }}>
          {item.section.title}
        </Box>
        {' · '}
        {t(item.isNew ? 'feed.forum.new' : 'feed.forum.active')}
      </Typography>
      <Link
        href={href}
        underline="hover"
        color="text.primary"
        variant="body2"
        sx={{ display: 'block', fontWeight: 600 }}
      >
        {item.title}
      </Link>
      <Typography
        variant="caption"
        color="text.secondary"
        component="p"
        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}
      >
        <MessageSquare size={12} aria-hidden />
        <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatCount(item.discussion?.comments ?? 0, locale)}
        </Box>
        {' · '}
        {formatAgo(item.at, locale)}
      </Typography>
    </Box>
  );
}
