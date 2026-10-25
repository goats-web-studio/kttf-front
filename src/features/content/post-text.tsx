import { markupToPlain } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import { useId, useState, type ReactNode } from 'react';

import { useT } from '@/common/i18n';
import RichText from '@/common/rich/rich-text';

/** Сколько знаков видно до «Читать полностью». */
const PREVIEW = 320;

/**
 * Текст записи клуба и тренера — с разметкой, ссылками и отметками
 * (ADR-076). Длинный свёрнут до нескольких строк: резать саму разметку
 * нельзя — посреди отметки она развалилась бы, поэтому сворачивается показ.
 */
export default function PostText({ text }: { readonly text: string }): ReactNode {
  const t = useT();
  const id = useId();
  const [open, setOpen] = useState(false);
  const long = markupToPlain(text).length > PREVIEW;

  return (
    <Box>
      <RichText
        id={id}
        text={text}
        sx={{
          maxWidth: 680,
          ...(long && !open
            ? {
                display: '-webkit-box',
                WebkitLineClamp: 6,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }
            : {}),
        }}
      />
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
