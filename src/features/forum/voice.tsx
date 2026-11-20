import {
  FORUM_BRAND_NAME,
  type ForumAuthor,
  type ForumAuthoredAs,
  type ForumCoauthor,
  type ForumPostRole,
} from '@kttf/shared/types';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { fill, useT, type MessageKey } from '@/common/i18n';
import PillTabs from '@/common/ui/pill-tabs';

import AuthorLine, { Tag } from './author-line';

/**
 * «От чьего лица» — ADR-098. Модератор пишет от себя, от KTTF или от KTTF с
 * соавтором; у сообщения KTTF вместо человека — знак портала и метка
 * «Официально», настоящего автора видят только модераторы.
 */

const VOICE_KEYS: Readonly<Record<ForumAuthoredAs, MessageKey>> = {
  SELF: 'forum.voice.SELF',
  KTTF: 'forum.voice.KTTF',
  KTTF_WITH_COAUTHOR: 'forum.voice.KTTF_WITH_COAUTHOR',
};

const VOICE_OPTIONS: readonly (readonly [ForumAuthoredAs, MessageKey])[] = [
  ['SELF', VOICE_KEYS.SELF],
  ['KTTF', VOICE_KEYS.KTTF],
  ['KTTF_WITH_COAUTHOR', VOICE_KEYS.KTTF_WITH_COAUTHOR],
];

const MARK_SIZES = { sm: 28, md: 36 } as const;

/** Знак KTTF — тот же, что в шапке карточки новости в ленте. */
export function KttfMark({ size = 'md' }: { readonly size?: 'sm' | 'md' }): ReactNode {
  const px = MARK_SIZES[size];

  return (
    <Avatar
      variant="rounded"
      alt=""
      aria-hidden
      data-kttf-mark
      sx={{
        width: px,
        height: px,
        flexShrink: 0,
        borderRadius: '28%',
        bgcolor: 'var(--night)',
        color: 'var(--night-red)',
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: size === 'sm' ? 9 : 11,
        fontStyle: 'italic',
      }}
    >
      {FORUM_BRAND_NAME}
    </Avatar>
  );
}

/** «Соавтор: Фамилия Имя» — ссылкой на профиль игрока. */
export function CoauthorLine({ coauthor }: { readonly coauthor: ForumCoauthor }): ReactNode {
  const t = useT();

  return (
    <Typography variant="body2" color="text.secondary" data-forum-coauthor>
      {t('forum.voice.coauthor')}{' '}
      {coauthor.playerId === null ? (
        coauthor.name
      ) : (
        <Link href={`/players/${coauthor.playerId}`} underline="hover" color="text.primary">
          {coauthor.name}
        </Link>
      )}
    </Typography>
  );
}

/**
 * Шапка сообщения по его голосу: «от себя» — профиль игрока (ADR-064 §2),
 * от KTTF — знак, «KTTF», «Официально» и соавтор, если он есть. Модератору
 * сервер присылает и настоящего автора — строкой «написал: …».
 */
export default function PostAuthor({
  authoredAs,
  author,
  coauthor,
  role = null,
  meta,
  size = 'md',
}: {
  readonly authoredAs: ForumAuthoredAs;
  readonly author: ForumAuthor | null;
  readonly coauthor: ForumCoauthor | null;
  readonly role?: ForumPostRole | null;
  readonly meta?: ReactNode;
  readonly size?: 'sm' | 'md';
}): ReactNode {
  const t = useT();

  if (authoredAs === 'SELF') {
    return <AuthorLine author={author} role={role} meta={meta} size={size} />;
  }

  return (
    <Box
      data-forum-voice={authoredAs}
      sx={{ display: 'flex', gap: 1.5, alignItems: 'center', minWidth: 0 }}
    >
      <KttfMark size={size} />
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
          <Typography component="span" sx={{ fontWeight: 700 }}>
            {FORUM_BRAND_NAME}
          </Typography>
          <Tag tone="red" data="official">
            {t('forum.voice.official')}
          </Tag>
        </Box>
        {coauthor !== null && <CoauthorLine coauthor={coauthor} />}
        {author !== null && (
          <Typography variant="caption" color="text.secondary" component="p" data-forum-written-by>
            {fill(t('forum.voice.writtenBy'), { name: author.name })}
          </Typography>
        )}
        {meta}
      </Box>
    </Box>
  );
}

/** Выбор голоса — у модератора над полем сообщения. */
export function VoicePicker({
  value,
  onChange,
}: {
  readonly value: ForumAuthoredAs;
  readonly onChange: (next: ForumAuthoredAs) => void;
}): ReactNode {
  const t = useT();

  return (
    <Box data-forum-voice-picker sx={{ mb: 1.5 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75, fontWeight: 600 }}>
        {t('forum.voice.label')}
      </Typography>
      <PillTabs
        value={value}
        options={VOICE_OPTIONS}
        label={t('forum.voice.label')}
        onChange={onChange}
      />
      {value !== 'SELF' && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          {t(value === 'KTTF' ? 'forum.voice.hintKttf' : 'forum.voice.hintCoauthor')}
        </Typography>
      )}
    </Box>
  );
}
