import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import type { Block, Inline } from './legal-markdown';

/** Текст документа — ADR-091. Только компоненты React, без вставки HTML. */
export default function LegalArticle({ blocks }: { readonly blocks: readonly Block[] }): ReactNode {
  return (
    <Box component="article" sx={{ display: 'grid', gap: 1.5 }} data-legal-article>
      {blocks.map((block, index) => (
        <LegalBlock key={`${block.kind}-${String(index)}`} block={block} />
      ))}
    </Box>
  );
}

function LegalBlock({ block }: { readonly block: Block }): ReactNode {
  switch (block.kind) {
    case 'h2':
      return (
        <Typography
          variant="h5"
          component="h2"
          id={block.id ?? undefined}
          sx={{ mt: 2, scrollMarginTop: 96 }}
        >
          <Inlines content={block.content} />
        </Typography>
      );
    case 'h3':
      return (
        <Typography variant="h6" component="h3" id={block.id ?? undefined}>
          <Inlines content={block.content} />
        </Typography>
      );
    case 'p':
      return (
        <Typography component="p">
          <Inlines content={block.content} />
        </Typography>
      );
    case 'ul':
    case 'ol':
      return (
        <Box component={block.kind} sx={{ m: 0, pl: 3, display: 'grid', gap: 0.75 }}>
          {block.items.map((item, index) => (
            <Typography component="li" key={String(index)}>
              <Inlines content={item} />
            </Typography>
          ))}
        </Box>
      );
  }
}

function Inlines({ content }: { readonly content: readonly Inline[] }): ReactNode {
  return content.map((part, index) => {
    const key = String(index);

    if (part.kind !== 'link') {
      return part.kind === 'bold' ? (
        <strong key={key}>{part.text}</strong>
      ) : (
        <span key={key}>{part.text}</span>
      );
    }
    if (part.href.startsWith('/')) {
      // Свои страницы — через роутер (тема делает `Link` ссылкой роутера).
      return (
        <Link key={key} href={part.href}>
          {part.text}
        </Link>
      );
    }

    return (
      <a
        key={key}
        href={part.href}
        {...(part.href.startsWith('https://') ? { target: '_blank', rel: 'noreferrer' } : {})}
      >
        {part.text}
      </a>
    );
  });
}
