import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import type { ReactNode } from 'react';

import { fill, formatDateTime, useLocale, useT } from '@/common/i18n';

import { topicHref } from './labels';
import { forumPlayerPostsQuery } from './queries';

/** Сколько последних сообщений в профиле. */
const LAST = 5;

/**
 * «На форуме» в профиле игрока — F2, `docs/12` 3.2: последние сообщения со
 * ссылкой на место в теме. Нет сообщений — блока нет: пустая карточка в
 * профиле ничего о человеке не говорит.
 */
export default function PlayerForumPosts({ playerId }: { readonly playerId: string }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const posts = useQuery(forumPlayerPostsQuery({ authorPlayerId: playerId, page: 1, limit: LAST }));

  if (posts.data === undefined || posts.data.items.length === 0) return null;

  return (
    <Box component="section" sx={{ mt: { xs: 5, md: 6 } }} data-player-forum>
      <Stack
        direction="row"
        sx={{ alignItems: 'baseline', justifyContent: 'space-between', gap: 2, mb: 2 }}
      >
        <Typography variant="h2">{t('forum.profile.title')}</Typography>
        <Typography variant="body2" color="text.secondary">
          {fill(t('forum.profile.count'), { count: String(posts.data.total) })}
        </Typography>
      </Stack>
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <Box component="ul" sx={{ m: 0, p: 0 }}>
          {posts.data.items.map((post) => (
            <Box
              component="li"
              key={post.id}
              sx={{
                listStyle: 'none',
                px: { xs: 2, sm: 2.5 },
                py: 2,
                borderTop: '1px solid var(--line)',
                '&:first-of-type': { borderTop: 0 },
              }}
            >
              <Link
                href={topicHref(post.topic.id, post.number)}
                underline="hover"
                color="text.primary"
                sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}
              >
                {post.topic.title}
              </Link>
              <Typography sx={{ mt: 0.5, color: 'var(--ink-700)', overflowWrap: 'anywhere' }}>
                {post.excerpt}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5, display: 'flex', gap: 1, alignItems: 'center' }}
              >
                {formatDateTime(post.createdAt, locale)}
                {post.likes > 0 && (
                  <Box
                    component="span"
                    sx={{ display: 'inline-flex', gap: 0.5, alignItems: 'center' }}
                  >
                    <Heart size={14} aria-hidden />
                    {post.likes}
                  </Box>
                )}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  );
}
