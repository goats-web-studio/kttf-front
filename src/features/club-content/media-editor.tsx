import {
  CLUB_IMAGE_MAX_BYTES,
  clubImageVariant,
  parseYoutubeId,
  rejectPhoto,
  type ClubMediaView,
  type ClubView,
} from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ImagePlus, Play, Trash2 } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { fill, useT, type MessageKey } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';

import {
  addClubVideo,
  deleteClubMedia,
  reorderClubMedia,
  updateClubMedia,
  uploadClubPhoto,
} from './api';
import { allClubMediaQuery, clubContentKeys } from './queries';

/**
 * Фото и видео в кабинете клуба — ADR-055, `docs/09` 3.2.
 *
 * Фото — сразу в галерею, можно выбрать несколько за раз: они уходят по
 * одному, чтобы ошибка одного не теряла остальные. Видео — ссылкой на
 * YouTube. Порядок — стрелками, как в прайсе.
 */
export default function MediaEditor({ club }: { readonly club: ClubView }): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const media = useQuery(allClubMediaQuery(club.id));
  const input = useRef<HTMLInputElement>(null);
  const [video, setVideo] = useState('');
  const [rejected, setRejected] = useState<MessageKey | null>(null);
  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: clubContentKeys.all });
  };

  const photos = useMutation({
    mutationFn: async (files: readonly File[]) => {
      for (const file of files) {
        await uploadClubPhoto(club.id, file, '');
      }
    },
    onSettled: refresh,
  });
  const addVideo = useMutation({
    mutationFn: (url: string) => addClubVideo(club.id, { url }),
    onSuccess: async () => {
      setVideo('');
      await refresh();
    },
  });
  const reorder = useMutation({
    mutationFn: (ids: readonly string[]) => reorderClubMedia(club.id, ids),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteClubMedia(club.id, id),
    onSuccess: refresh,
  });

  const items = media.data ?? [];
  const move = (index: number, by: -1 | 1): void => {
    const ids = items.map((item) => item.id);
    const [id] = ids.splice(index, 1);

    if (id !== undefined) {
      ids.splice(index + by, 0, id);
      reorder.mutate(ids);
    }
  };
  const error = photos.error ?? addVideo.error ?? reorder.error ?? remove.error;

  return (
    <Box sx={{ mt: 3 }}>
      <Paper variant="outlined" component="section" sx={{ p: { xs: 2.5, sm: 4 } }}>
        <Typography variant="h2">{t('manage.media.add')}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 680 }}>
          {t('manage.page.imageHint')}
        </Typography>
        <Box
          sx={{
            mt: 3,
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', md: 'auto 1fr' },
          }}
        >
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

                // Отказ одному файлу — отказ всей пачке: молча загрузить
                // часть выбранного хуже, чем сказать, что не так.
                const bad = files
                  .map((file) => rejectPhoto(file, CLUB_IMAGE_MAX_BYTES))
                  .find((rejection) => rejection !== null);

                if (bad !== undefined) {
                  setRejected(bad === 'SIZE' ? 'manage.page.imageTooBig' : 'manage.page.imageType');
                  return;
                }

                setRejected(null);
                if (files.length > 0) photos.mutate(files);
              }}
            />
            <Button
              variant="outlined"
              startIcon={<ImagePlus size={18} aria-hidden />}
              disabled={photos.isPending}
              onClick={() => input.current?.click()}
              sx={{ minHeight: 48 }}
            >
              {photos.isPending ? t('manage.page.uploading') : t('manage.media.photos')}
            </Button>
          </Box>
          <Box
            component="form"
            onSubmit={(event) => {
              event.preventDefault();

              if (parseYoutubeId(video) === null) {
                setRejected('manage.media.notYoutube');
                return;
              }

              setRejected(null);
              addVideo.mutate(video);
            }}
            sx={{ display: 'flex', gap: 1, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}
          >
            <TextField
              label={t('manage.media.videoUrl')}
              placeholder="https://youtu.be/…"
              value={video}
              onChange={(event) => {
                setVideo(event.target.value);
              }}
              size="small"
              fullWidth
            />
            <Button
              type="submit"
              variant="outlined"
              disabled={addVideo.isPending || video.trim() === ''}
              sx={{ minHeight: 40, flexShrink: 0 }}
            >
              {addVideo.isPending ? t('common.loading') : t('manage.media.addVideo')}
            </Button>
          </Box>
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
      </Paper>

      <Box sx={{ mt: 3 }}>
        <QueryState
          isPending={media.isPending}
          error={media.error}
          onRetry={() => void media.refetch()}
          loading={<RowsSkeleton rows={2} />}
        >
          {items.length === 0 ? (
            <Typography color="text.secondary">{t('manage.media.empty')}</Typography>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {fill(t('manage.media.count'), { count: String(items.length) })}
              </Typography>
              <Box
                component="ul"
                sx={{
                  m: 0,
                  p: 0,
                  listStyle: 'none',
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
                }}
              >
                {items.map((item, index) => (
                  <MediaItem
                    key={item.id}
                    clubId={club.id}
                    item={item}
                    first={index === 0}
                    last={index === items.length - 1}
                    busy={reorder.isPending || remove.isPending}
                    onMove={(by) => {
                      move(index, by);
                    }}
                    onRemove={() => {
                      if (window.confirm(t('manage.media.deleteConfirm'))) remove.mutate(item.id);
                    }}
                  />
                ))}
              </Box>
            </>
          )}
        </QueryState>
      </Box>
    </Box>
  );
}

function MediaItem({
  clubId,
  item,
  first,
  last,
  busy,
  onMove,
  onRemove,
}: {
  readonly clubId: string;
  readonly item: ClubMediaView;
  readonly first: boolean;
  readonly last: boolean;
  readonly busy: boolean;
  readonly onMove: (by: -1 | 1) => void;
  readonly onRemove: () => void;
}): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const [caption, setCaption] = useState(item.caption ?? '');
  const save = useMutation({
    mutationFn: () =>
      updateClubMedia(clubId, item.id, { caption: caption.trim() === '' ? null : caption.trim() }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clubContentKeys.all });
    },
  });

  return (
    <Paper variant="outlined" component="li" sx={{ overflow: 'hidden' }}>
      <Box sx={{ position: 'relative' }}>
        <Box
          component="img"
          src={clubImageVariant(item.imageUrl, 480)}
          alt=""
          loading="lazy"
          sx={{ display: 'block', width: '100%', aspectRatio: '4 / 3', objectFit: 'cover' }}
        />
        {item.kind === 'VIDEO' && (
          <Box
            sx={{
              position: 'absolute',
              left: 8,
              top: 8,
              px: 1,
              py: 0.25,
              borderRadius: 999,
              bgcolor: 'var(--ink-900)',
              color: 'var(--paper)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <Play size={12} aria-hidden fill="currentColor" />
            YouTube
          </Box>
        )}
      </Box>
      <Box sx={{ p: 1.5 }}>
        {item.hidden && (
          <Alert severity="warning" sx={{ mb: 1 }}>
            {t('manage.content.hidden')}
          </Alert>
        )}
        <TextField
          size="small"
          fullWidth
          label={t('manage.media.caption')}
          value={caption}
          onChange={(event) => {
            setCaption(event.target.value);
          }}
          onBlur={() => {
            if ((caption.trim() === '' ? null : caption.trim()) !== item.caption) save.mutate();
          }}
          slotProps={{ htmlInput: { maxLength: 200 } }}
        />
        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <IconButton
            aria-label={t('manage.prices.up')}
            disabled={first || busy}
            onClick={() => {
              onMove(-1);
            }}
            sx={{ width: 44, height: 44 }}
          >
            <ArrowUp size={18} aria-hidden />
          </IconButton>
          <IconButton
            aria-label={t('manage.prices.down')}
            disabled={last || busy}
            onClick={() => {
              onMove(1);
            }}
            sx={{ width: 44, height: 44 }}
          >
            <ArrowDown size={18} aria-hidden />
          </IconButton>
          <IconButton
            aria-label={t('manage.media.delete')}
            disabled={busy}
            onClick={onRemove}
            sx={{ width: 44, height: 44 }}
          >
            <Trash2 size={18} aria-hidden />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
}
