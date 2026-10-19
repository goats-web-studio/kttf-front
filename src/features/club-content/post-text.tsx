import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useId, useState, type ReactNode } from 'react';

import { useT } from '@/common/i18n';

import { textParts } from './text-parts';

/** Сколько знаков видно до «Читать полностью». */
const PREVIEW = 320;

/**
 * Текст записи: переносы строк как вписаны, ссылки кликабельны и помечены
 * `nofollow ugc` — их пишет клуб, а не мы. Длинный текст свёрнут.
 */
export default function PostText({ text }: { readonly text: string }): ReactNode {
  const t = useT();
  const id = useId();
  const [open, setOpen] = useState(false);
  const long = text.length > PREVIEW;
  const shown = long && !open ? `${text.slice(0, PREVIEW).trimEnd()}…` : text;

  return (
    <Box>
      <Typography id={id} sx={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere', maxWidth: 680 }}>
        {textParts(shown).map((part, index) =>
          part.kind === 'link' ? (
            <Link
              // Куски не переставляются: индекс — честный ключ.
              key={index}
              href={part.value}
              target="_blank"
              rel="nofollow ugc noopener noreferrer"
            >
              {part.value}
            </Link>
          ) : (
            <span key={index}>{part.value}</span>
          ),
        )}
      </Typography>
      {long && (
        <Link
          component="button"
          type="button"
          variant="body2"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => {
            setOpen((value) => !value);
          }}
          sx={{ mt: 0.5, minHeight: 44 }}
        >
          {t(open ? 'club.posts.collapse' : 'club.posts.expand')}
        </Link>
      )}
    </Box>
  );
}
