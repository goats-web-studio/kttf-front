import type { ForumAuthor } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import PlayerAvatar from '@/common/ui/player-avatar';
import RatingValue from '@/common/ui/rating-value';

import { splitName } from './labels';

/**
 * Автор сообщения — реальный профиль игрока (ADR-064 §2): фото, имя
 * ссылкой на профиль, рейтинг и клуб. Администратор помечен «Модератор».
 * Под строкой — дата и прочее, что передаст место.
 */
export default function AuthorLine({
  author,
  meta,
  size = 'md',
}: {
  readonly author: ForumAuthor | null;
  readonly meta?: ReactNode;
  readonly size?: 'sm' | 'md';
}): ReactNode {
  const t = useT();

  if (author === null) {
    return (
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', minWidth: 0 }}>
        <PlayerAvatar lastName="?" firstName="" size={size} />
        <Box sx={{ minWidth: 0 }}>
          <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
            {t('forum.author.gone')}
          </Typography>
          {meta}
        </Box>
      </Box>
    );
  }

  const { lastName, firstName } = splitName(author.name);
  const name =
    author.playerId === null ? (
      <Typography component="span" sx={{ fontWeight: 600 }}>
        {author.name}
      </Typography>
    ) : (
      <Link
        href={`/players/${author.playerId}`}
        underline="hover"
        color="text.primary"
        sx={{ fontWeight: 600 }}
      >
        {author.name}
      </Link>
    );

  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', minWidth: 0 }}>
      <PlayerAvatar
        lastName={lastName}
        firstName={firstName}
        photoUrl={author.photoUrl}
        size={size}
      />
      <Box sx={{ minWidth: 0 }}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'baseline',
            columnGap: 1,
            rowGap: 0.25,
          }}
        >
          {name}
          {author.rating !== null && (
            <RatingValue
              value={String(author.rating)}
              animate={false}
              sx={{ fontSize: 14, fontWeight: 600, color: 'text.secondary' }}
            />
          )}
          {author.club !== null && (
            <Link
              href={`/clubs/${author.club.id}`}
              underline="hover"
              variant="body2"
              color="text.secondary"
            >
              {author.club.name}
            </Link>
          )}
          {author.moderator && (
            <Box
              component="span"
              data-forum-moderator
              sx={{
                px: 1,
                borderRadius: 1,
                fontSize: 12,
                lineHeight: '20px',
                fontWeight: 600,
                bgcolor: 'var(--red-50)',
                color: 'var(--red-700)',
              }}
            >
              {t('forum.author.moderator')}
            </Box>
          )}
        </Box>
        {meta}
      </Box>
    </Box>
  );
}
