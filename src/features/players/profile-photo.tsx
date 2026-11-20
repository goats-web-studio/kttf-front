import ButtonBase from '@mui/material/ButtonBase';
import { useState, type ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';
import PhotoViewer from '@/common/ui/photo-viewer';
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

      <PhotoViewer
        photos={[{ src: photoUrl, alt: name }]}
        index={open ? 0 : null}
        onClose={() => {
          setOpen(false);
        }}
        label={name}
        maxWidth="min(90vw, 720px)"
      />
    </>
  );
}
