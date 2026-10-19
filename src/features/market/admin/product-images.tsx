import {
  CLUB_IMAGE_MAX_BYTES,
  PRODUCT_IMAGES_MAX,
  catalogImageVariant,
  rejectPhoto,
  type ProductImageView,
} from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, ImagePlus, Trash2 } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { fill, useT, type MessageKey } from '@/common/i18n';

import { deleteProductImage, reorderProductImages, uploadProductImage } from '../api';
import { moveId } from './image-order';

/**
 * Фото товара — загрузка, удаление, порядок (`docs/10` 3.1, конвейер `sharp`
 * клубов). Первое фото — главное: оно в плитке каталога.
 *
 * Порядок — перетаскиванием на десктопе и стрелками везде: перетаскивание
 * пальцем и с клавиатуры не работает, стрелки работают. Файлы уходят по
 * одному, как в галерее клуба: ошибка одного не теряет остальные.
 */
export default function ProductImages({
  productId,
  images,
  onChanged,
}: {
  readonly productId: string;
  readonly images: readonly ProductImageView[];
  readonly onChanged: () => Promise<unknown>;
}): ReactNode {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [rejected, setRejected] = useState<MessageKey | null>(null);
  const [dragged, setDragged] = useState<number | null>(null);

  const upload = useMutation({
    mutationFn: async (files: readonly File[]) => {
      for (const file of files) await uploadProductImage(productId, file);
    },
    onSettled: onChanged,
  });
  const reorder = useMutation({
    mutationFn: (ids: readonly string[]) => reorderProductImages(productId, ids),
    onSettled: onChanged,
  });
  const remove = useMutation({
    mutationFn: (imageId: string) => deleteProductImage(productId, imageId),
    onSettled: onChanged,
  });

  const ids = images.map((image) => image.id);
  const busy = upload.isPending || reorder.isPending || remove.isPending;
  const room = PRODUCT_IMAGES_MAX - images.length;
  const error = upload.error ?? reorder.error ?? remove.error;
  const move = (from: number, to: number): void => {
    if (from === to) return;
    reorder.mutate(moveId(ids, from, to));
  };

  return (
    <Box>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          event.target.value = '';

          const bad = files
            .map((file) => rejectPhoto(file, CLUB_IMAGE_MAX_BYTES))
            .find((rejection) => rejection !== null);
          if (bad !== undefined) {
            setRejected(bad === 'SIZE' ? 'manage.page.imageTooBig' : 'manage.page.imageType');
            return;
          }
          if (files.length > room) {
            setRejected('catalog.images.tooMany');
            return;
          }

          setRejected(null);
          if (files.length > 0) upload.mutate(files);
        }}
      />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <Button
          variant="outlined"
          startIcon={<ImagePlus size={18} aria-hidden />}
          disabled={busy || room <= 0}
          onClick={() => input.current?.click()}
          sx={{ minHeight: 48 }}
        >
          {upload.isPending ? t('manage.page.uploading') : t('catalog.images.add')}
        </Button>
        <Typography variant="body2" color="text.secondary">
          {fill(t('catalog.images.count'), {
            count: String(images.length),
            max: String(PRODUCT_IMAGES_MAX),
          })}
        </Typography>
      </Box>
      {rejected !== null && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t(rejected)}
        </Alert>
      )}
      {error !== null && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t(errorMessageKey(error))}
        </Alert>
      )}

      {images.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          {t('catalog.images.empty')}
        </Typography>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {t('catalog.images.orderHint')}
          </Typography>
          <Box
            component="ol"
            sx={{
              m: 0,
              mt: 1.5,
              p: 0,
              listStyle: 'none',
              display: 'grid',
              gap: 2,
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                sm: 'repeat(4, minmax(0, 1fr))',
              },
            }}
          >
            {images.map((image, index) => (
              <Paper
                key={image.id}
                variant="outlined"
                component="li"
                draggable={!busy}
                onDragStart={() => {
                  setDragged(index);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragged !== null) move(dragged, index);
                  setDragged(null);
                }}
                onDragEnd={() => {
                  setDragged(null);
                }}
                sx={{
                  overflow: 'hidden',
                  cursor: busy ? 'default' : 'grab',
                  opacity: dragged === index ? 0.5 : 1,
                }}
              >
                <Box
                  component="img"
                  src={catalogImageVariant(image.url, 240)}
                  width={image.width}
                  height={image.height}
                  alt={fill(t('market.gallery.open'), {
                    index: String(index + 1),
                    count: String(images.length),
                  })}
                  loading="lazy"
                  draggable={false}
                  sx={{
                    display: 'block',
                    width: '100%',
                    height: 'auto',
                    aspectRatio: '1 / 1',
                    objectFit: 'contain',
                    bgcolor: 'var(--paper)',
                  }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  {index === 0 && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mr: 'auto', pl: 1.5 }}
                    >
                      {t('catalog.images.main')}
                    </Typography>
                  )}
                  <IconButton
                    aria-label={t('catalog.images.earlier')}
                    disabled={index === 0 || busy}
                    onClick={() => {
                      move(index, index - 1);
                    }}
                    sx={{ width: 44, height: 44 }}
                  >
                    <ArrowLeft size={18} aria-hidden />
                  </IconButton>
                  <IconButton
                    aria-label={t('catalog.images.later')}
                    disabled={index === images.length - 1 || busy}
                    onClick={() => {
                      move(index, index + 1);
                    }}
                    sx={{ width: 44, height: 44 }}
                  >
                    <ArrowRight size={18} aria-hidden />
                  </IconButton>
                  <IconButton
                    aria-label={t('catalog.images.delete')}
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(t('catalog.images.deleteConfirm')))
                        remove.mutate(image.id);
                    }}
                    sx={{ width: 44, height: 44 }}
                  >
                    <Trash2 size={18} aria-hidden />
                  </IconButton>
                </Box>
              </Paper>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}
