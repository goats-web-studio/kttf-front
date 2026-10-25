import { FEED_POSTS_SECTION } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { useT } from '@/common/i18n';
import { createForumTopic } from '@/features/forum/api';
import Composer, { WriteGate } from '@/features/forum/composer';
import { forumKeys, forumSectionsQuery } from '@/features/forum/queries';

import { postTitle } from './labels';
import { feedKeys } from './queries';

/**
 * «Поделиться» — запись игрока в ленту (ADR-073). Это тема раздела форума
 * «Записи игроков»: ответы, «нравится», жалобы и модерация — форумные.
 * Свёрнута в строку, пока не нажали: лента — главное, форма — по желанию.
 */
export default function PostComposer(): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const sections = useQuery(forumSectionsQuery);
  const section = sections.data?.find((row) => row.slug === FEED_POSTS_SECTION);

  if (section === undefined) return null;

  if (!open) {
    return (
      <ButtonBase
        onClick={() => {
          setOpen(true);
        }}
        data-feed-compose
        sx={{
          width: '100%',
          justifyContent: 'space-between',
          gap: 2,
          px: 2.5,
          minHeight: 56,
          borderRadius: 3,
          bgcolor: 'var(--paper)',
          boxShadow: 'var(--shadow-card)',
          color: 'text.secondary',
          typography: 'body1',
          textAlign: 'left',
          transition: 'box-shadow var(--dur-fast) var(--ease)',
          '&:hover': { boxShadow: 'var(--shadow-card-hover)' },
        }}
      >
        {t('feed.compose.prompt')}
        <ImagePlus size={20} aria-hidden />
      </ButtonBase>
    );
  }

  return (
    <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: 'var(--paper)', boxShadow: 'var(--shadow-card)' }}>
      <WriteGate>
        <Composer
          draftKey="feed-post"
          placeholder={t('feed.compose.placeholder')}
          submitLabel={t('feed.compose.submit')}
          submit={(input) =>
            createForumTopic({
              sectionId: section.id,
              title: postTitle(input.body, t('feed.compose.fallbackTitle')),
              body: input.body,
              ...(input.images === undefined ? {} : { images: input.images }),
            })
          }
          onDone={() => {
            setOpen(false);
            void queryClient.invalidateQueries({ queryKey: feedKeys.all });
            void queryClient.invalidateQueries({ queryKey: forumKeys.all });
          }}
          onCancel={() => {
            setOpen(false);
          }}
        />
      </WriteGate>
    </Box>
  );
}
