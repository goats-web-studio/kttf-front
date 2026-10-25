import { markupToPlain, type ForumImage, type ForumPostView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';
import RichText from '@/common/rich/rich-text';

import { forumImageVariant } from './labels';

/**
 * Текст как вписан: переносы строк сохраняются, ссылки кликабельны и
 * помечены `nofollow ugc` — их пишут люди, а не мы (ADR-055 §8).
 */
export function ForumText({
  text,
  large = false,
}: {
  readonly text: string;
  /** Статья темы — кеглем крупнее (ADR-067 §1). */
  readonly large?: boolean;
}): ReactNode {
  return (
    // Разметка, ссылки и отметки — ADR-076.
    <RichText
      text={text}
      sx={{ maxWidth: 720, ...(large ? { fontSize: 18, lineHeight: '28px' } : {}) }}
      data-forum-text
    />
  );
}

/** Цитата — снимок фрагмента с автором и ссылкой на исходное сообщение. */
export function ForumQuote({
  quote,
  href,
}: {
  readonly quote: NonNullable<ForumPostView['quote']>;
  readonly href: string | null;
}): ReactNode {
  const t = useT();
  const who =
    quote.authorName === null
      ? t('forum.quote.anonymous')
      : fill(t('forum.quote.wrote'), { name: quote.authorName });

  return (
    <Box
      component="blockquote"
      data-forum-quote
      sx={{
        m: 0,
        mb: 1.5,
        pl: 2,
        py: 1,
        pr: 1.5,
        borderLeft: '3px solid var(--line-strong)',
        borderRadius: '0 8px 8px 0',
        bgcolor: 'var(--paper-sunken)',
        maxWidth: 720,
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5 }}>
        {href === null || quote.number === null ? (
          who
        ) : (
          <Link href={href} color="inherit" underline="hover">
            {who} · #{quote.number}
          </Link>
        )}
      </Typography>
      <Typography
        variant="body2"
        sx={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere', color: 'var(--ink-700)' }}
      >
        {markupToPlain(quote.text)}
      </Typography>
    </Box>
  );
}

/** Фото сообщения: сеткой, по нажатию — во всю ширину в новой вкладке. */
export function ForumImages({ images }: { readonly images: readonly ForumImage[] }): ReactNode {
  if (images.length === 0) return null;

  return (
    <Box
      data-forum-images
      sx={{
        mt: 1.5,
        display: 'grid',
        gap: 1,
        gridTemplateColumns:
          images.length === 1 ? 'minmax(0, 480px)' : 'repeat(2, minmax(0, 240px))',
      }}
    >
      {images.map((image) => (
        <Box
          key={image.url}
          component="a"
          href={image.url}
          target="_blank"
          rel="noopener"
          sx={{ display: 'block', borderRadius: 2, overflow: 'hidden', bgcolor: 'var(--ink-100)' }}
        >
          <Box
            component="img"
            src={forumImageVariant(image.url, images.length === 1 ? 960 : 480)}
            alt=""
            width={image.width}
            height={image.height}
            loading="lazy"
            sx={{
              display: 'block',
              width: '100%',
              height: 'auto',
              aspectRatio: `${String(image.width)} / ${String(image.height)}`,
            }}
          />
        </Box>
      ))}
    </Box>
  );
}
