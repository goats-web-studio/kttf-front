import { parseBlocks, type Inline } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography, { type TypographyProps } from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { mentionHref } from './mention-href';

function Inlines({ parts }: { readonly parts: readonly Inline[] }): ReactNode {
  return parts.map((part, index) => {
    // Куски не переставляются: индекс — честный ключ.
    switch (part.kind) {
      case 'text':
        return <span key={index}>{part.value}</span>;
      case 'bold':
        return (
          <Box component="strong" key={index} sx={{ fontWeight: 700 }}>
            <Inlines parts={part.children} />
          </Box>
        );
      case 'italic':
        return (
          <em key={index}>
            <Inlines parts={part.children} />
          </em>
        );
      case 'link':
        return (
          <Link key={index} href={part.href} target="_blank" rel="nofollow ugc noopener noreferrer">
            {part.label}
          </Link>
        );
      case 'mention':
        return (
          <Link
            key={index}
            href={mentionHref(part.target, part.ref)}
            underline="hover"
            data-mention={part.target}
            sx={{ fontWeight: 600 }}
          >
            {part.target === 'product' ? part.label : `@${part.label}`}
          </Link>
        );
    }
  });
}

/**
 * Текст с разметкой — ADR-076: абзацы, списки, жирный и курсив, ссылки и
 * отметки игроков, клубов, тренеров, товаров и турниров. Строится из
 * разбора общего кода, без HTML: в тексте нельзя ничего «вставить».
 * Ссылки чужих людей — `nofollow ugc`, отметки ведут на страницы сайта.
 */
export default function RichText({
  text,
  sx,
  ...rest
}: {
  readonly text: string;
  /** Стили поверх своих — объектом. */
  readonly sx?: Readonly<Record<string, unknown>>;
} & Omit<TypographyProps<'div'>, 'children' | 'sx'>): ReactNode {
  return (
    <Typography
      component="div"
      data-rich-text
      sx={{
        overflowWrap: 'anywhere',
        '& p': { m: 0 },
        '& p + p, & p + ul, & p + ol, & ul + p, & ol + p': { mt: 1.25 },
        '& ul, & ol': { m: 0, pl: 3 },
        '& li + li': { mt: 0.25 },
        ...sx,
      }}
      {...rest}
    >
      {parseBlocks(text).map((block, index) => {
        if (block.kind === 'paragraph') {
          return (
            <p key={index}>
              {block.lines.map((line, lineIndex) => (
                <span key={lineIndex}>
                  {lineIndex > 0 && <br />}
                  <Inlines parts={line} />
                </span>
              ))}
            </p>
          );
        }

        const List = block.kind === 'bullets' ? 'ul' : 'ol';

        return (
          <List key={index}>
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>
                <Inlines parts={item} />
              </li>
            ))}
          </List>
        );
      })}
    </Typography>
  );
}
