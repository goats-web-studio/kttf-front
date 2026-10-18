import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import { X } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';
import PlayerAvatar from '@/common/ui/player-avatar';

interface ProfilePhotoProps {
  readonly lastName: string;
  readonly firstName: string;
  readonly photoUrl: string | null;
}

/**
 * Фото в шапке профиля — крупно, а по нажатию открывается целиком в окне
 * просмотра, как у RTTF: в кружке лицо обрезано, а человека хотят узнать
 * в зале.
 *
 * Без фото кнопки нет: инициалы увеличивать незачем, а кнопка, которая
 * открывает те же две буквы, — обман. Окно закрывается крестиком, Esc и
 * нажатием мимо фото; фокус возвращается на фото (07, 9).
 */
export default function ProfilePhoto({
  lastName,
  firstName,
  photoUrl,
}: ProfilePhotoProps): ReactNode {
  const t = useT();
  const [open, setOpen] = useState(false);
  const avatar = (
    <PlayerAvatar lastName={lastName} firstName={firstName} photoUrl={photoUrl} size="hero" />
  );

  if (photoUrl === null || photoUrl === '') {
    return avatar;
  }

  const name = `${lastName} ${firstName}`;

  return (
    <>
      <ButtonBase
        onClick={() => {
          setOpen(true);
        }}
        aria-label={fill(t('profile.photo.open'), { name })}
        data-profile-photo
        sx={{
          flexShrink: 0,
          borderRadius: '50%',
          cursor: 'zoom-in',
          transition: 'box-shadow var(--dur-fast) var(--ease)',
          '@media (hover: hover)': { '&:hover': { boxShadow: '0 0 0 4px var(--ink-100)' } },
          '&.Mui-focusVisible': { outline: '2px solid var(--red-600)', outlineOffset: '3px' },
        }}
      >
        {avatar}
      </ButtonBase>

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        maxWidth={false}
        slotProps={{
          paper: {
            // Роль `dialog` у MUI — на листе, а не на корне: название вешается сюда.
            'aria-label': name,
            sx: {
              m: 2,
              bgcolor: 'transparent',
              boxShadow: 'none',
              border: 0,
              overflow: 'visible',
              position: 'relative',
            },
          },
        }}
      >
        <Box
          component="img"
          src={photoUrl}
          alt={name}
          sx={{
            display: 'block',
            maxWidth: 'min(90vw, 720px)',
            maxHeight: '85vh',
            objectFit: 'contain',
            borderRadius: 4,
            bgcolor: 'var(--paper)',
            boxShadow: 'var(--shadow-modal)',
          }}
        />
        <IconButton
          onClick={() => {
            setOpen(false);
          }}
          aria-label={t('profile.photo.close')}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 44,
            height: 44,
            bgcolor: 'var(--paper)',
            color: 'var(--ink-900)',
            boxShadow: 'var(--shadow-pop)',
            '&:hover': { bgcolor: 'var(--paper-hover)' },
          }}
        >
          <X size={20} aria-hidden />
        </IconButton>
      </Dialog>
    </>
  );
}
