import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

const SIZES = { sm: 28, md: 36, lg: 56, xl: 88 } as const;

interface PlayerAvatarProps {
  readonly lastName: string;
  readonly firstName: string;
  /** Фото из профиля; без него — инициалы. */
  readonly photoUrl?: string | null;
  readonly size?: keyof typeof SIZES;
  /** Обводка цветом медали — у призёров на пьедестале. */
  readonly ring?: string;
}

/**
 * Аватар игрока: фото или инициалы «ФИ».
 *
 * Инициалы на нейтральной подложке, а не на цветной по хешу имени: десяток
 * разноцветных кружков в таблице спорил бы с единственным акцентом — красным.
 * Аватар декоративен — имя всегда написано рядом, поэтому `aria-hidden`.
 */
export default function PlayerAvatar({
  lastName,
  firstName,
  photoUrl,
  size = 'md',
  ring,
}: PlayerAvatarProps): ReactNode {
  const px = SIZES[size];
  const initials = `${lastName.charAt(0)}${firstName.charAt(0)}`.toUpperCase();

  return (
    <Box
      aria-hidden
      sx={{
        width: px,
        height: px,
        flexShrink: 0,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
        bgcolor: 'var(--ink-100)',
        color: 'var(--ink-700)',
        fontWeight: 600,
        fontSize: Math.round(px * 0.38),
        letterSpacing: 0,
        boxShadow: ring === undefined ? 'none' : `0 0 0 3px var(--paper), 0 0 0 6px ${ring}`,
        userSelect: 'none',
      }}
    >
      {photoUrl === null || photoUrl === undefined || photoUrl === '' ? (
        initials
      ) : (
        <Box
          component="img"
          src={photoUrl}
          alt=""
          width={px}
          height={px}
          loading="lazy"
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
    </Box>
  );
}
