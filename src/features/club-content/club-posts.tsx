import { MAX_PAGE_SIZE, clubImageVariant, type ClubPostView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { Pin } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { fill, formatDate, useLocale, useT } from '@/common/i18n';

import PostText from './post-text';
import { clubPostsQuery } from './queries';

/** Сколько записей сразу и сколько добавляет «Показать ещё». */
const STEP = 3;

/**
 * Акции и новости клуба — ADR-055, `docs/09` 3.2. Закреплённая — первой,
 * прошедшие акции сервер сам уводит в архив. Пустой раздел не показывается.
 */
export default function ClubPosts({ clubId }: { readonly clubId: string }): ReactNode {
  const t = useT();
  const [limit, setLimit] = useState(STEP);
  const posts = useQuery(clubPostsQuery(clubId, { page: 1, limit }));
  const items = posts.data?.items ?? [];

  if (items.length === 0) return null;

  const more = (posts.data?.total ?? 0) > items.length;

  return (
    <Box component="section" sx={{ mt: 6 }}>
      <Typography variant="h2" sx={{ mb: 2 }}>
        {t('club.posts.title')}
      </Typography>
      <Box sx={{ display: 'grid', gap: 2 }}>
        {items.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </Box>
      {more && (
        <Button
          onClick={() => {
            setLimit((value) => Math.min(value + STEP * 2, MAX_PAGE_SIZE));
          }}
          disabled={posts.isFetching}
          sx={{ mt: 2, minHeight: 44 }}
        >
          {t('club.posts.more')}
        </Button>
      )}
    </Box>
  );
}

export function PostCard({
  post,
  actions,
}: {
  readonly post: ClubPostView;
  readonly actions?: ReactNode;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const promo = post.kind === 'PROMO';

  return (
    <Paper variant="outlined" component="article" sx={{ overflow: 'hidden' }}>
      {post.imageUrl !== null && (
        <Box
          component="img"
          src={clubImageVariant(post.imageUrl, 960)}
          srcSet={`${clubImageVariant(post.imageUrl, 480)} 480w, ${clubImageVariant(post.imageUrl, 960)} 960w`}
          sizes="(min-width: 900px) 760px, 100vw"
          alt=""
          loading="lazy"
          sx={{
            display: 'block',
            width: '100%',
            aspectRatio: '16 / 9',
            objectFit: 'cover',
            bgcolor: 'var(--ink-100)',
          }}
        />
      )}
      <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
          <Box
            component="span"
            sx={{
              px: 1.25,
              height: 24,
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              bgcolor: promo ? 'var(--red-50)' : 'var(--ink-100)',
              color: promo ? 'var(--red-700)' : 'var(--ink-700)',
            }}
          >
            {promo && post.validUntil !== null
              ? fill(t('club.posts.promoUntil'), {
                  date: formatDate(`${post.validUntil}T12:00:00Z`, locale),
                })
              : t(promo ? 'club.posts.promo' : 'club.posts.news')}
          </Box>
          {post.pinned && (
            <Typography
              component="span"
              variant="caption"
              color="text.secondary"
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
            >
              <Pin size={14} aria-hidden />
              {t('club.posts.pinned')}
            </Typography>
          )}
          <Typography component="span" variant="caption" color="text.secondary">
            {formatDate(post.publishedAt, locale)}
          </Typography>
        </Box>
        <Typography variant="h3" component="h3" sx={{ mt: 1.25, mb: 1 }}>
          {post.title}
        </Typography>
        <PostText text={post.body} />
        {actions}
      </Box>
    </Paper>
  );
}
