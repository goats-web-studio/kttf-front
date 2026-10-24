import type { ForumAuthor, ForumPostRole } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import PlayerAvatar from '@/common/ui/player-avatar';
import RatingValue from '@/common/ui/rating-value';

import { ROLE_KEYS, splitName } from './labels';

/** Метка у имени — «Модератор», «Организатор», «Тренер»: маленькая плашка. */
function Tag({
  children,
  tone,
  href,
  data,
}: {
  readonly children: ReactNode;
  readonly tone: 'red' | 'ink' | 'ok';
  readonly href?: string;
  readonly data?: string;
}): ReactNode {
  const colors = {
    red: { bgcolor: 'var(--red-50)', color: 'var(--red-700)' },
    ink: { bgcolor: 'var(--ink-100)', color: 'var(--ink-700)' },
    ok: { bgcolor: 'var(--ok-50)', color: 'var(--ok-text)' },
  }[tone];
  const sx = {
    px: 1,
    borderRadius: 1,
    fontSize: 12,
    lineHeight: '20px',
    fontWeight: 600,
    textDecoration: 'none',
    ...colors,
  };

  return href === undefined ? (
    <Box component="span" sx={sx} data-forum-tag={data}>
      {children}
    </Box>
  ) : (
    <Link href={href} underline="none" sx={sx} data-forum-tag={data}>
      {children}
    </Link>
  );
}

/**
 * Автор сообщения — реальный профиль игрока (ADR-064 §2): фото с точкой
 * «в сети», имя ссылкой на профиль, рейтинг и клуб. Метки (ADR-067): кто
 * говорит за обсуждаемую сторону — «Организатор», «Клуб», «Тренер»; у кого
 * опубликована страница тренера — «Тренер» ссылкой на неё; администратор —
 * «Модератор». Под строкой — дата и прочее, что передаст место.
 */
export default function AuthorLine({
  author,
  role = null,
  meta,
  size = 'md',
}: {
  readonly author: ForumAuthor | null;
  readonly role?: ForumPostRole | null;
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
      <Box sx={{ position: 'relative', flexShrink: 0 }}>
        <PlayerAvatar
          lastName={lastName}
          firstName={firstName}
          photoUrl={author.photoUrl}
          size={size}
        />
        {author.online && (
          <Box
            component="span"
            role="img"
            aria-label={t('forum.author.online')}
            title={t('forum.author.online')}
            data-forum-online
            sx={{
              position: 'absolute',
              right: -1,
              bottom: -1,
              width: 12,
              height: 12,
              borderRadius: '50%',
              bgcolor: 'var(--ok)',
              boxShadow: '0 0 0 2px var(--paper)',
            }}
          />
        )}
      </Box>
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
          {role !== null && (
            <Tag tone="ok" data={`role-${role}`}>
              {t(ROLE_KEYS[role])}
            </Tag>
          )}
          {/* Своя метка тренера не дублирует метку стороны «Тренер». */}
          {author.coachSlug !== null && role !== 'COACH' && (
            <Tag tone="ink" href={`/coaches/${author.coachSlug}`} data="coach">
              {t('forum.author.coach')}
            </Tag>
          )}
          {author.moderator && (
            <Tag tone="red" data="moderator">
              {t('forum.author.moderator')}
            </Tag>
          )}
        </Box>
        {meta}
      </Box>
    </Box>
  );
}
