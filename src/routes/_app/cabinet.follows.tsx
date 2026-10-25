import type { Followed } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { formatRating, useT, type MessageKey } from '@/common/i18n';
import EmptyState from '@/common/ui/empty-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import Surface from '@/common/ui/surface';
import { sourceHref } from '@/features/feed/labels';
import { SourceMark } from '@/features/feed/source-mark';
import FollowButton from '@/features/follows/follow-button';
import { myFollowsQuery } from '@/features/follows/queries';
import FollowSuggestions from '@/features/follows/suggestions';

export const Route = createFileRoute('/_app/cabinet/follows')({
  component: MyFollowsPage,
});

const TYPE_KEYS: Readonly<Record<Followed['type'], MessageKey>> = {
  CLUB: 'follow.type.club',
  COACH: 'follow.type.coach',
  PLAYER: 'follow.type.player',
};

/**
 * «Подписки» — ADR-075: на кого подписан, с отпиской в строке, и кого ещё
 * предложить. Их новости и события — во вкладке ленты «Подписки».
 */
function MyFollowsPage(): ReactNode {
  const t = useT();
  const mine = useQuery(myFollowsQuery);

  return (
    <Container maxWidth="lg" component="section">
      <Typography variant="h1">{t('cabinet.nav.follows')}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
        {t('cabinet.follows.lead')}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          alignItems: 'start',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) 300px' },
        }}
      >
        <Surface flush title={t('cabinet.follows.title')}>
          {mine.isPending ? (
            <Box sx={{ p: 2 }}>
              <RowsSkeleton rows={3} />
            </Box>
          ) : (mine.data?.length ?? 0) === 0 ? (
            <Box sx={{ p: 2 }}>
              <EmptyState
                title={t('cabinet.follows.empty')}
                action={<Button href="/">{t('cabinet.follows.toFeed')}</Button>}
              />
            </Box>
          ) : (
            <Box component="ul" sx={{ m: 0, p: 0 }} data-my-follows>
              {mine.data?.map((row) => (
                <FollowedRow key={`${row.type}-${row.id}`} row={row} />
              ))}
            </Box>
          )}
        </Surface>
        <FollowSuggestions />
      </Box>
    </Container>
  );
}

function FollowedRow({ row }: { readonly row: Followed }): ReactNode {
  const t = useT();
  const source = {
    kind: row.type,
    id: row.id,
    name: row.name,
    imageUrl: row.imageUrl,
    slug: row.slug,
  };
  const where = row.city === null ? '' : ` · ${row.city}`;

  return (
    <Box
      component="li"
      sx={{
        listStyle: 'none',
        px: { xs: 2, sm: 3 },
        py: 1.5,
        borderTop: '1px solid var(--line)',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      <SourceMark source={source} />
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Link
          href={sourceHref(source) ?? undefined}
          color="inherit"
          underline="hover"
          noWrap
          sx={{ display: 'block', fontWeight: 600 }}
        >
          {row.name}
        </Link>
        <Typography variant="body2" color="text.secondary" noWrap>
          {row.rating === null ? t(TYPE_KEYS[row.type]) : formatRating(row.rating)}
          {where}
        </Typography>
      </Box>
      <FollowButton type={row.type} id={row.id} bare />
    </Box>
  );
}
