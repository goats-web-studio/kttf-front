import { clubImageVariant, type FeedSource } from '@kttf/shared/types';
import Avatar from '@mui/material/Avatar';
import type { ReactNode } from 'react';

import PlayerAvatar from '@/common/ui/player-avatar';
import { splitName } from '@/features/forum/labels';

/** Знак источника: логотип клуба, фото тренера и игрока, у KTTF — знак бренда. */
export function SourceMark({ source }: { readonly source: FeedSource }): ReactNode {
  if (source.kind === 'PLAYER' || source.kind === 'COACH') {
    const { lastName, firstName } = splitName(source.name);

    return (
      <PlayerAvatar
        lastName={lastName}
        firstName={firstName}
        photoUrl={source.imageUrl}
        size="md"
      />
    );
  }

  return (
    <Avatar
      variant="rounded"
      src={source.imageUrl === null ? undefined : clubImageVariant(source.imageUrl, 480)}
      alt=""
      sx={{
        width: 36,
        height: 36,
        borderRadius: '28%',
        bgcolor: source.kind === 'KTTF' ? 'var(--night)' : 'var(--red-50)',
        color: source.kind === 'KTTF' ? 'var(--night-red)' : 'var(--red-700)',
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: source.kind === 'KTTF' ? 11 : 15,
        fontStyle: source.kind === 'KTTF' ? 'italic' : 'normal',
      }}
    >
      {source.kind === 'KTTF' ? 'KTTF' : source.name.trim().charAt(0).toUpperCase()}
    </Avatar>
  );
}
