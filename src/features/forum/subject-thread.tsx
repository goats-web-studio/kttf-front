import type { ForumSubjectType } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type ReactNode } from 'react';

import { fill, useT, type MessageKey } from '@/common/i18n';
import { RowsSkeleton } from '@/common/ui/skeleton';

import { postToForumSubject } from './api';
import Composer, { WriteGate, type DraftQuote } from './composer';
import { topicHref } from './labels';
import PostCard from './post-card';
import { forumKeys, forumSubjectQuery } from './queries';

/**
 * Заголовок блока: у турнира — обсуждение, у клуба, тренера и товара —
 * отзывы (ADR-064 §7: тема предмета и есть текстовые отзывы, без оценок).
 */
const TITLES: Readonly<Record<ForumSubjectType, MessageKey>> = {
  TOURNAMENT: 'forum.thread.discussion',
  CLUB: 'forum.thread.reviews',
  COACH: 'forum.thread.reviews',
  PRODUCT: 'forum.thread.reviews',
};

const EMPTY: Readonly<Record<ForumSubjectType, MessageKey>> = {
  TOURNAMENT: 'forum.thread.emptyDiscussion',
  CLUB: 'forum.thread.emptyReviews',
  COACH: 'forum.thread.emptyReviews',
  PRODUCT: 'forum.thread.emptyReviews',
};

/**
 * Обсуждение на странице предмета — F2, `docs/12` 3.2. Последние сообщения
 * темы предмета и поле ответа; первое сообщение заводит тему в разделе
 * форума этого типа. Ссылка «Вся тема» — на форум, где ответов больше.
 */
export default function SubjectThread({
  type,
  id,
  mt = 6,
}: {
  readonly type: ForumSubjectType;
  readonly id: string;
  readonly mt?: number | Record<string, number>;
}): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const thread = useQuery(forumSubjectQuery(type, id));
  const composer = useRef<HTMLTextAreaElement>(null);
  const [quote, setQuote] = useState<DraftQuote | null>(null);

  // Предмет непубличный или раздела нет — блока нет: отказ здесь не нужен человеку.
  if (thread.isError || thread.data?.section === null) return null;

  const topic = thread.data?.topic ?? null;
  const canReply = topic === null ? true : topic.canReply;
  const locked = topic?.locked === true;

  return (
    <Box component="section" sx={{ mt }} data-forum-thread={type}>
      <Stack
        direction="row"
        sx={{ alignItems: 'baseline', justifyContent: 'space-between', gap: 2, mb: 2 }}
      >
        <Typography variant="h2">{t(TITLES[type])}</Typography>
        {topic !== null && (
          <Link href={topicHref(topic.id)} variant="body2" data-forum-thread-all>
            {fill(t('forum.thread.all'), { count: String(topic.postsCount) })}
          </Link>
        )}
      </Stack>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        {thread.isPending ? (
          <RowsSkeleton rows={2} />
        ) : thread.data.posts.length === 0 ? (
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {t(EMPTY[type])}
          </Typography>
        ) : (
          <Box sx={{ mb: 3 }}>
            {thread.data.posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                canReply={canReply}
                onQuote={(next) => {
                  setQuote(next);
                  composer.current?.scrollIntoView({ block: 'center' });
                  composer.current?.focus({ preventScroll: true });
                }}
              />
            ))}
          </Box>
        )}

        <WriteGate locked={locked && !canReply}>
          {canReply && (
            <Composer
              ref={composer}
              quote={quote}
              onClearQuote={() => {
                setQuote(null);
              }}
              placeholder={t(
                type === 'TOURNAMENT'
                  ? 'forum.thread.placeholder'
                  : 'forum.thread.reviewPlaceholder',
              )}
              submit={async (input) => {
                await postToForumSubject(type, id, input);
                await queryClient.invalidateQueries({ queryKey: forumKeys.all });
              }}
            />
          )}
        </WriteGate>
      </Paper>
    </Box>
  );
}
