import type { ForumTopicItem } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { Eye, Lock, MessagesSquare, Pin } from 'lucide-react';
import type { ReactNode } from 'react';

import { fill, formatDateTime, useLocale, useT } from '@/common/i18n';

import { sectionHref, SUBJECT_KEYS, topicHref } from './labels';

/**
 * Строка темы в списке: заголовок, раздел (если список не по разделу),
 * автор, ответы и последняя активность. Закреплённая и закрытая — значками
 * с подписью для читалки.
 */
export default function TopicRow({
  topic,
  showSection = false,
}: {
  readonly topic: ForumTopicItem;
  readonly showSection?: boolean;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const replies = Math.max(0, topic.postsCount - 1);
  // «Последнее сообщение» — ссылкой на него по номеру.
  const lastHref = topicHref(topic.id, topic.postsCount);

  return (
    <Box
      component="li"
      data-forum-topic={topic.id}
      sx={{
        listStyle: 'none',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) 170px 200px' },
        gap: { xs: 0.5, sm: 2 },
        alignItems: 'center',
        px: { xs: 2, sm: 2.5 },
        py: 2,
        borderTop: '1px solid var(--line)',
        '&:first-of-type': { borderTop: 0 },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
          {topic.pinned && (
            <Box
              component="span"
              sx={{ display: 'inline-flex', color: 'var(--red-600)' }}
              title={t('forum.topic.pinned')}
            >
              <Pin size={16} aria-label={t('forum.topic.pinned')} />
            </Box>
          )}
          {topic.locked && (
            <Box
              component="span"
              sx={{ display: 'inline-flex', color: 'text.secondary' }}
              title={t('forum.topic.locked')}
            >
              <Lock size={16} aria-label={t('forum.topic.locked')} />
            </Box>
          )}
          <Link
            href={topicHref(topic.id)}
            underline="hover"
            color="text.primary"
            sx={{ fontWeight: 600, fontSize: 17, lineHeight: '24px', overflowWrap: 'anywhere' }}
          >
            {topic.title}
          </Link>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {showSection && (
            <>
              <Link href={sectionHref(topic.section.slug)} color="inherit" underline="hover">
                {topic.section.title}
              </Link>
              {' · '}
            </>
          )}
          {topic.subject !== null && (
            <>
              {t(SUBJECT_KEYS[topic.subject.type])}
              {' · '}
            </>
          )}
          {/* У новости автор — клуб или тренер, а не тот, кто нажал «Опубликовать». */}
          {topic.subject?.owner?.name ?? topic.author?.name ?? t('forum.author.gone')}
          {topic.unread !== null && topic.unread > 0 && topic.firstUnread !== null && (
            <>
              {' · '}
              <Link
                href={topicHref(topic.id, topic.firstUnread)}
                underline="hover"
                sx={{ fontWeight: 600, color: 'var(--red-600)' }}
                data-forum-unread={topic.unread}
              >
                {fill(t('forum.topic.unread'), { count: String(topic.unread) })}
              </Link>
            </>
          )}
        </Typography>
      </Box>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}
      >
        <MessagesSquare size={16} aria-hidden />
        {fill(t('forum.topic.replies'), { count: String(replies) })}
        <Box
          component="span"
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, ml: 1 }}
          title={t('forum.topic.viewsShort')}
        >
          <Eye size={16} aria-label={t('forum.topic.viewsShort')} />
          {topic.viewsCount}
        </Box>
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 0 }}>
        <Link href={lastHref} color="inherit" underline="hover">
          {formatDateTime(topic.lastPostAt, locale)}
        </Link>
        {topic.lastAuthorName !== null && (
          <Box component="span" sx={{ display: { xs: 'inline', sm: 'block' } }}>
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
              {' · '}
            </Box>
            {topic.lastAuthorName}
          </Box>
        )}
      </Typography>
    </Box>
  );
}
