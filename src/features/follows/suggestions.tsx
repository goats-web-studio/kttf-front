import type { FollowSuggestion } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { formatRating, useT, type MessageKey } from '@/common/i18n';
import Surface from '@/common/ui/surface';
import { useSessionStore } from '@/features/auth/session-store';
import { sourceHref } from '@/features/feed/labels';
import { SourceMark } from '@/features/feed/source-mark';

import FollowButton from './follow-button';
import { followSuggestionsQuery } from './queries';

const REASON_KEYS: Readonly<Record<FollowSuggestion['reason'], MessageKey>> = {
  CITY: 'follow.reason.city',
  PLAYED: 'follow.reason.played',
  OPPONENT: 'follow.reason.opponent',
  POPULAR: 'follow.reason.popular',
};

const TYPE_KEYS: Readonly<Record<FollowSuggestion['type'], MessageKey>> = {
  CLUB: 'follow.type.club',
  COACH: 'follow.type.coach',
  PLAYER: 'follow.type.player',
};

/**
 * «На кого подписаться» — колонка главной (ADR-073). Вошедшему — по его
 * игре и городу, гостю — популярные. Пусто — блока нет.
 */
export default function FollowSuggestions(): ReactNode {
  const t = useT();
  const signedIn = useSessionStore((state) => state.user !== null);
  const list = useQuery(followSuggestionsQuery(signedIn));

  if ((list.data?.length ?? 0) === 0) return null;

  return (
    <Surface flush title={t('follow.suggestions.title')}>
      <Box component="ul" sx={{ m: 0, p: 0 }} data-follow-suggestions>
        {list.data?.map((row) => {
          const href = sourceHref({
            kind: row.type,
            id: row.id,
            slug: row.slug,
            name: row.name,
            imageUrl: row.imageUrl,
          });

          return (
            <Box
              component="li"
              key={`${row.type}-${row.id}`}
              sx={{
                listStyle: 'none',
                px: 2,
                py: 1.25,
                borderTop: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
              }}
            >
              <SourceMark
                source={{
                  kind: row.type,
                  id: row.id,
                  slug: row.slug,
                  name: row.name,
                  imageUrl: row.imageUrl,
                }}
              />
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Link
                  href={href ?? undefined}
                  color="inherit"
                  underline="hover"
                  noWrap
                  sx={{ display: 'block', fontWeight: 600, typography: 'body2' }}
                >
                  {row.name}
                </Link>
                <Typography variant="caption" color="text.secondary" component="p" noWrap>
                  {row.rating === null ? t(TYPE_KEYS[row.type]) : formatRating(row.rating)} ·{' '}
                  {t(REASON_KEYS[row.reason])}
                </Typography>
              </Box>
              <FollowButton type={row.type} id={row.id} bare />
            </Box>
          );
        })}
      </Box>
    </Surface>
  );
}
