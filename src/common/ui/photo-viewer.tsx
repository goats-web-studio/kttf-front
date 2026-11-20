import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { useT } from '@/common/i18n';

export interface ViewerPhoto {
  readonly src: string;
  /** Подпись для чтения с экрана; пусто — фото без подписи. */
  readonly alt: string;
}

const roundButton = {
  width: 44,
  height: 44,
  bgcolor: 'var(--paper)',
  color: 'var(--ink-900)',
  boxShadow: 'var(--shadow-pop)',
  '&:hover': { bgcolor: 'var(--paper-hover)' },
} as const;

/**
 * Фото целиком поверх страницы — аватар в профиле, фото записей в ленте и
 * на форуме. В кружке или в карточке фото обрезано; здесь — как снято.
 *
 * Закрывается крестиком, Esc и нажатием мимо фото; фокус возвращается на
 * то, что его открыло (07, 9). Несколько фото листаются стрелками на
 * экране и на клавиатуре.
 */
export default function PhotoViewer({
  photos,
  index,
  onIndex,
  onClose,
  label,
  maxWidth = 'min(92vw, 1200px)',
}: {
  readonly photos: readonly ViewerPhoto[];
  /** Открытое фото; `null` — окно закрыто. */
  readonly index: number | null;
  readonly onIndex?: (index: number) => void;
  readonly onClose: () => void;
  /** Название окна для чтения с экрана. */
  readonly label: string;
  readonly maxWidth?: string;
}): ReactNode {
  const t = useT();
  const photo = index === null ? undefined : photos[index];
  // Закрытое окно ещё гаснет — фото держится до конца, а не пропадает сразу.
  const [shown, setShown] = useState(photo);
  if (photo !== undefined && (photo.src !== shown?.src || photo.alt !== shown.alt)) setShown(photo);
  const many = photos.length > 1 && onIndex !== undefined;

  const go = (by: -1 | 1): void => {
    if (index === null || onIndex === undefined) return;
    onIndex((index + by + photos.length) % photos.length);
  };

  return (
    <Dialog
      open={photo !== undefined}
      onClose={onClose}
      maxWidth={false}
      onKeyDown={(event) => {
        if (!many) return;
        if (event.key === 'ArrowLeft') go(-1);
        if (event.key === 'ArrowRight') go(1);
      }}
      slotProps={{
        paper: {
          // Роль `dialog` у MUI — на листе, а не на корне: название вешается сюда.
          'aria-label': label,
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
      {shown !== undefined && (
        <Box
          component="img"
          src={shown.src}
          alt={shown.alt}
          data-photo-viewer
          sx={{
            display: 'block',
            maxWidth,
            maxHeight: '85vh',
            objectFit: 'contain',
            borderRadius: 4,
            bgcolor: 'var(--paper)',
            boxShadow: 'var(--shadow-modal)',
          }}
        />
      )}
      <IconButton
        onClick={onClose}
        aria-label={t('profile.photo.close')}
        sx={{ ...roundButton, position: 'absolute', top: 8, right: 8 }}
      >
        <X size={20} aria-hidden />
      </IconButton>
      {many && (
        <>
          <IconButton
            onClick={() => {
              go(-1);
            }}
            aria-label={t('club.gallery.prev')}
            sx={{
              ...roundButton,
              position: 'absolute',
              left: 8,
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          >
            <ChevronLeft size={22} aria-hidden />
          </IconButton>
          <IconButton
            onClick={() => {
              go(1);
            }}
            aria-label={t('club.gallery.next')}
            sx={{
              ...roundButton,
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          >
            <ChevronRight size={22} aria-hidden />
          </IconButton>
          <Box
            sx={{
              position: 'absolute',
              left: '50%',
              bottom: 8,
              transform: 'translateX(-50%)',
              px: 1.5,
              borderRadius: 999,
              bgcolor: 'var(--paper)',
              color: 'var(--ink-900)',
              typography: 'body2',
              fontVariantNumeric: 'tabular-nums',
              boxShadow: 'var(--shadow-pop)',
            }}
          >
            {`${String((index ?? 0) + 1)} / ${String(photos.length)}`}
          </Box>
        </>
      )}
    </Dialog>
  );
}
