import { clubImageVariant, type ClubMediaView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';

import { clubMediaQuery } from './queries';

/** Сколько видно сразу; остальное — «Показать все». */
const PREVIEW = 6;

/**
 * Фото и видео клуба — ADR-055, `docs/09` 3.2.
 *
 * Сетка миниатюр — узкий вариант картинки и ленивая загрузка: галерея ниже
 * первого экрана и не должна тормозить его (`docs/09` 6). Нажатие открывает
 * просмотр во весь экран. Видео — своя обложка с кнопкой: плеер YouTube
 * (`youtube-nocookie.com`) грузится только по нажатию, до этого Google не
 * знает о посетителе страницы клуба.
 */
export default function ClubGallery({ clubId }: { readonly clubId: string }): ReactNode {
  const t = useT();
  const media = useQuery(clubMediaQuery(clubId));
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const items = media.data ?? [];

  if (items.length === 0) return null;

  const shown = all ? items : items.slice(0, PREVIEW);

  return (
    <Box component="section" sx={{ mt: 6 }}>
      <Typography variant="h2" sx={{ mb: 2 }}>
        {t('club.gallery.title')}
      </Typography>
      <Box
        component="ul"
        sx={{
          m: 0,
          p: 0,
          listStyle: 'none',
          display: 'grid',
          gap: 1,
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' },
        }}
      >
        {shown.map((item, index) => (
          <Box component="li" key={item.id}>
            <ButtonBase
              onClick={() => {
                setOpen(index);
              }}
              aria-label={
                item.caption ??
                t(item.kind === 'VIDEO' ? 'club.gallery.video' : 'club.gallery.photo')
              }
              sx={{
                display: 'block',
                width: '100%',
                borderRadius: 2,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <Box
                component="img"
                src={clubImageVariant(item.imageUrl, 480)}
                alt=""
                loading="lazy"
                width={item.width}
                height={item.height}
                sx={{
                  display: 'block',
                  width: '100%',
                  height: 'auto',
                  aspectRatio: '4 / 3',
                  objectFit: 'cover',
                  bgcolor: 'var(--ink-100)',
                }}
              />
              {item.kind === 'VIDEO' && <PlayBadge />}
            </ButtonBase>
          </Box>
        ))}
      </Box>
      {!all && items.length > PREVIEW && (
        <Button
          onClick={() => {
            setAll(true);
          }}
          sx={{ mt: 2, minHeight: 44 }}
        >
          {fill(t('club.gallery.all'), { count: String(items.length) })}
        </Button>
      )}
      {open !== null && (
        <Viewer
          items={items}
          index={open}
          onIndex={setOpen}
          onClose={() => {
            setOpen(null);
          }}
        />
      )}
    </Box>
  );
}

function PlayBadge(): ReactNode {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'rgba(31, 31, 29, 0.25)',
      }}
    >
      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          bgcolor: 'var(--red-600)',
          color: 'var(--paper)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Play size={24} fill="currentColor" />
      </Box>
    </Box>
  );
}

/** Просмотр во весь экран: стрелки, клавиатура, подпись. На телефоне — на весь экран. */
function Viewer({
  items,
  index,
  onIndex,
  onClose,
}: {
  readonly items: readonly ClubMediaView[];
  readonly index: number;
  readonly onIndex: (index: number) => void;
  readonly onClose: () => void;
}): ReactNode {
  const t = useT();
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  const item = items[index];

  if (item === undefined) return null;

  const go = (by: -1 | 1): void => {
    onIndex((index + by + items.length) % items.length);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      fullScreen={phone}
      maxWidth="lg"
      fullWidth
      aria-label={item.caption ?? t('club.gallery.title')}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') go(-1);
        if (event.key === 'ArrowRight') go(1);
      }}
      slotProps={{ paper: { sx: { bgcolor: 'var(--ink-900)', color: 'var(--paper)' } } }}
    >
      <Box sx={{ position: 'relative', display: 'grid', placeItems: 'center', minHeight: 240 }}>
        {item.kind === 'VIDEO' && item.youtubeId !== null ? (
          // Ключ по ролику: перелистнули — старый плеер выгружается.
          <Video key={item.id} item={item} youtubeId={item.youtubeId} />
        ) : (
          <Box
            component="img"
            src={clubImageVariant(item.imageUrl, 1600)}
            srcSet={`${clubImageVariant(item.imageUrl, 960)} 960w, ${clubImageVariant(item.imageUrl, 1600)} 1600w`}
            sizes="(min-width: 1200px) 1200px, 100vw"
            alt={item.caption ?? ''}
            sx={{ display: 'block', maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
          />
        )}
        <IconButton
          aria-label={t('club.gallery.close')}
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 44,
            height: 44,
            color: 'inherit',
            bgcolor: 'rgba(0,0,0,0.4)',
          }}
        >
          <X size={20} aria-hidden />
        </IconButton>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5 }}>
        {items.length > 1 && (
          <IconButton
            aria-label={t('club.gallery.prev')}
            onClick={() => {
              go(-1);
            }}
            sx={{ width: 44, height: 44, color: 'inherit' }}
          >
            <ChevronLeft size={22} aria-hidden />
          </IconButton>
        )}
        <Typography sx={{ flex: 1, textAlign: 'center' }} variant="body2">
          {item.caption ?? ''}
          <Box component="span" sx={{ ml: 1, opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>
            {`${String(index + 1)} / ${String(items.length)}`}
          </Box>
        </Typography>
        {items.length > 1 && (
          <IconButton
            aria-label={t('club.gallery.next')}
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

/**
 * Ролик — сначала своя обложка, плеер только по нажатию (`docs/09` 7.3).
 * `youtube-nocookie.com` — единственный чужой источник в CSP (`frame-src`).
 */
function Video({
  item,
  youtubeId,
}: {
  readonly item: ClubMediaView;
  readonly youtubeId: string;
}): ReactNode {
  const t = useT();
  const [playing, setPlaying] = useState(false);

  return (
    <Box sx={{ width: '100%', aspectRatio: '16 / 9', position: 'relative' }}>
      {playing ? (
        <Box
          component="iframe"
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
          title={item.caption ?? t('club.gallery.video')}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
        />
      ) : (
        <ButtonBase
          onClick={() => {
            setPlaying(true);
          }}
          aria-label={t('club.gallery.play')}
          sx={{ position: 'absolute', inset: 0 }}
        >
          <Box
            component="img"
            src={clubImageVariant(item.imageUrl, 1600)}
            alt=""
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <PlayBadge />
        </ButtonBase>
      )}
    </Box>
  );
}
