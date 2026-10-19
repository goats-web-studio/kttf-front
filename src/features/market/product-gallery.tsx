import { catalogImageVariant, type ProductImageView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';

interface ProductGalleryProps {
  readonly images: readonly ProductImageView[];
  readonly name: string;
  /** Раскладка телефона: лента с прокруткой пальцем (`docs/10` 5.5). */
  readonly strip?: boolean;
}

/**
 * Фото товара — `docs/10` 5.4, 5.5.
 *
 * Десктоп: большое фото и миниатюры под ним, нажатие открывает просмотр во
 * весь экран. Телефон: лента во всю ширину с прокруткой пальцем и
 * привязкой к кадру. Первое фото — главное на экране и грузится сразу,
 * остальные — лениво. Без фото раздела нет (ADR-042).
 */
export default function ProductGallery({
  images,
  name,
  strip = false,
}: ProductGalleryProps): ReactNode {
  const t = useT();
  const [current, setCurrent] = useState(0);
  const [open, setOpen] = useState<number | null>(null);

  const shown = Math.min(current, images.length - 1);
  const main = images[shown];

  if (main === undefined) return null;

  const label = (index: number): string =>
    fill(t('market.gallery.open'), {
      index: String(index + 1),
      count: String(images.length),
    });

  const viewer = open !== null && (
    <Viewer
      images={images}
      name={name}
      index={open}
      onIndex={setOpen}
      onClose={() => {
        setOpen(null);
      }}
    />
  );

  if (strip) {
    return (
      <Box component="section" aria-label={t('market.gallery.title')}>
        <Box
          component="ul"
          sx={{
            m: 0,
            p: 0,
            listStyle: 'none',
            display: 'flex',
            gap: 1,
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            overscrollBehaviorX: 'contain',
          }}
        >
          {images.map((image, index) => (
            <Box
              component="li"
              key={image.id}
              sx={{ flex: images.length > 1 ? '0 0 86%' : '0 0 100%', scrollSnapAlign: 'center' }}
            >
              <ButtonBase
                onClick={() => {
                  setOpen(index);
                }}
                aria-label={label(index)}
                sx={{ display: 'block', width: '100%', borderRadius: 4, overflow: 'hidden' }}
              >
                <Photo image={image} width={640} eager={index === 0} />
              </ButtonBase>
            </Box>
          ))}
        </Box>
        {viewer}
      </Box>
    );
  }

  return (
    <Box component="section" aria-label={t('market.gallery.title')}>
      <ButtonBase
        onClick={() => {
          setOpen(shown);
        }}
        aria-label={label(shown)}
        sx={{
          display: 'block',
          width: '100%',
          borderRadius: 4,
          overflow: 'hidden',
          border: 1,
          borderColor: 'divider',
          '&.Mui-focusVisible': { outline: '2px solid var(--red-600)', outlineOffset: '2px' },
        }}
      >
        <Photo image={main} width={640} eager large />
      </ButtonBase>
      {images.length > 1 && (
        <Box
          component="ul"
          sx={{ m: 0, mt: 1.5, p: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 1 }}
        >
          {images.map((image, index) => (
            <Box component="li" key={image.id}>
              <ButtonBase
                onClick={() => {
                  setCurrent(index);
                }}
                aria-label={label(index)}
                aria-pressed={index === shown}
                sx={{
                  display: 'block',
                  width: 72,
                  height: 72,
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: 2,
                  borderColor: index === shown ? 'var(--red-600)' : 'var(--line)',
                  bgcolor: 'var(--paper)',
                  '&.Mui-focusVisible': {
                    outline: '2px solid var(--red-600)',
                    outlineOffset: '2px',
                  },
                }}
              >
                <Box
                  component="img"
                  src={catalogImageVariant(image.url, 240)}
                  width={72}
                  height={72}
                  alt=""
                  loading="lazy"
                  sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </ButtonBase>
            </Box>
          ))}
        </Box>
      )}
      {main.credit !== null && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {fill(t('market.gallery.credit'), { credit: main.credit })}
        </Typography>
      )}
      {viewer}
    </Box>
  );
}

/** Фото в квадрате: товар целиком, без обрезки, на белом. */
function Photo({
  image,
  width,
  eager = false,
  large = false,
}: {
  readonly image: ProductImageView;
  readonly width: 640;
  readonly eager?: boolean;
  readonly large?: boolean;
}): ReactNode {
  return (
    <Box
      component="img"
      src={catalogImageVariant(image.url, width)}
      srcSet={`${catalogImageVariant(image.url, 640)} 640w, ${catalogImageVariant(image.url, 1280)} 1280w`}
      sizes={large ? '(min-width: 1200px) 760px, (min-width: 900px) 60vw, 100vw' : '86vw'}
      width={image.width}
      height={image.height}
      alt=""
      loading={eager ? 'eager' : 'lazy'}
      {...(eager ? { fetchPriority: 'high' as const } : {})}
      sx={{
        display: 'block',
        width: '100%',
        height: 'auto',
        aspectRatio: '1 / 1',
        objectFit: 'contain',
        bgcolor: 'var(--paper)',
      }}
    />
  );
}

/** Просмотр во весь экран: стрелки, клавиатура, счётчик — как галерея клуба. */
function Viewer({
  images,
  name,
  index,
  onIndex,
  onClose,
}: {
  readonly images: readonly ProductImageView[];
  readonly name: string;
  readonly index: number;
  readonly onIndex: (index: number) => void;
  readonly onClose: () => void;
}): ReactNode {
  const t = useT();
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  const image = images[index];

  if (image === undefined) return null;

  const go = (by: -1 | 1): void => {
    onIndex((index + by + images.length) % images.length);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      fullScreen={phone}
      maxWidth="lg"
      fullWidth
      aria-label={name}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') go(-1);
        if (event.key === 'ArrowRight') go(1);
      }}
      slotProps={{ paper: { sx: { bgcolor: 'var(--ink-900)', color: 'var(--paper)' } } }}
    >
      <Box sx={{ position: 'relative', display: 'grid', placeItems: 'center', minHeight: 240 }}>
        <Box
          component="img"
          src={catalogImageVariant(image.url, 1280)}
          srcSet={`${catalogImageVariant(image.url, 640)} 640w, ${catalogImageVariant(image.url, 1280)} 1280w`}
          sizes="(min-width: 1200px) 1200px, 100vw"
          width={image.width}
          height={image.height}
          alt={name}
          sx={{
            display: 'block',
            maxWidth: '100%',
            maxHeight: '80vh',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            bgcolor: 'var(--paper)',
          }}
        />
        <IconButton
          aria-label={t('market.gallery.close')}
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 44,
            height: 44,
            color: 'var(--paper)',
            bgcolor: 'var(--ink-900)',
          }}
        >
          <X size={20} aria-hidden />
        </IconButton>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5 }}>
        {images.length > 1 && (
          <IconButton
            aria-label={t('market.gallery.prev')}
            onClick={() => {
              go(-1);
            }}
            sx={{ width: 44, height: 44, color: 'inherit' }}
          >
            <ChevronLeft size={22} aria-hidden />
          </IconButton>
        )}
        <Typography variant="body2" sx={{ flex: 1, textAlign: 'center' }}>
          {image.credit === null ? '' : fill(t('market.gallery.credit'), { credit: image.credit })}
          <Box component="span" sx={{ ml: 1, fontVariantNumeric: 'tabular-nums' }}>
            {`${String(index + 1)} / ${String(images.length)}`}
          </Box>
        </Typography>
        {images.length > 1 && (
          <IconButton
            aria-label={t('market.gallery.next')}
            onClick={() => {
              go(1);
            }}
            sx={{ width: 44, height: 44, color: 'inherit' }}
          >
            <ChevronRight size={22} aria-hidden />
          </IconButton>
        )}
      </Box>
    </Dialog>
  );
}
