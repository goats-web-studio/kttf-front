import type { FeedTopicItem } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { useT, type MessageKey } from '@/common/i18n';
import PillTabs from '@/common/ui/pill-tabs';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { listForumPosts, renameForumTopic, updateForumPost } from '@/features/forum/api';
import Composer from '@/features/forum/composer';
import { forumKeys } from '@/features/forum/queries';

import { archiveTopic } from './api';
import FeedCard from './feed-card';
import { postTitle } from './labels';
import PostComposer from './post-composer';
import { feedKeys, wallKeys, wallQuery } from './queries';

type Shelf = 'live' | 'archive';

const SHELVES: readonly (readonly [Shelf, MessageKey])[] = [
  ['live', 'wall.tab.live'],
  ['archive', 'wall.tab.archive'],
];

interface PlayerWallProps {
  readonly playerId: string;
  /** Своя стена: форма записи, правка, архив. */
  readonly own: boolean;
  /** Заголовок над стеной — на профиле; в кабинете его даёт страница. */
  readonly heading?: boolean;
}

/**
 * Стена игрока — ADR-075: его записи, свежие сверху.
 *
 * Запись — тема форума «Записи игроков», поэтому ответы, «нравится» и
 * модерация — форумные, а здесь только то, что нужно хозяину: написать,
 * поправить, убрать в архив и вернуть. Чужая пустая стена не показывается.
 */
export default function PlayerWall({ playerId, own, heading = true }: PlayerWallProps): ReactNode {
  const t = useT();
  const [shelf, setShelf] = useState<Shelf>('live');
  const wall = useInfiniteQuery(wallQuery(playerId, own && shelf === 'archive'));
  const items = wall.data?.pages.flatMap((page) => page.items) ?? [];

  // Чужая стена без записей не показывается — и пока грузится тоже: пустое место
  // под результатами прыгало бы.
  if (!own && items.length === 0) return null;

  return (
    <Box component="section" data-player-wall sx={{ display: 'grid', gap: 2 }}>
      {heading && <Typography variant="h2">{t('wall.title')}</Typography>}
      {own && (
        <>
          <PostComposer />
          <PillTabs value={shelf} options={SHELVES} label={t('wall.title')} onChange={setShelf} />
        </>
      )}

      {wall.isPending ? (
        <RowsSkeleton rows={2} />
      ) : items.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography color="text.secondary">
            {t(shelf === 'archive' ? 'wall.empty.archive' : 'wall.empty.own')}
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {items.map((item) =>
            own ? <OwnPost key={item.id} item={item} /> : <FeedCard key={item.id} item={item} />,
          )}
        </Stack>
      )}

      {wall.hasNextPage && (
        <Button
          variant="outlined"
          onClick={() => void wall.fetchNextPage()}
          disabled={wall.isFetchingNextPage}
          sx={{ justifySelf: 'center', minHeight: 44, minWidth: 200 }}
        >
          {t('feed.more')}
        </Button>
      )}
    </Box>
  );
}

/** Своя запись: меню «Изменить / В архив / Вернуть», правка — на месте. */
function OwnPost({ item }: { readonly item: FeedTopicItem }): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [editing, setEditing] = useState(false);
  const topicId = item.discussion?.topicId;

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: wallKeys.all }),
      queryClient.invalidateQueries({ queryKey: feedKeys.all }),
      queryClient.invalidateQueries({ queryKey: forumKeys.all }),
    ]);
  };

  const archive = useMutation({
    mutationFn: (archived: boolean) => archiveTopic(topicId ?? '', archived),
    onSuccess: refresh,
  });

  if (topicId === undefined) return <FeedCard item={item} />;

  if (editing) {
    return (
      <EditPost
        topicId={topicId}
        onDone={() => {
          setEditing(false);
          void refresh();
        }}
        onCancel={() => {
          setEditing(false);
        }}
      />
    );
  }

  return (
    <FeedCard
      item={item}
      actions={
        <>
          <IconButton
            aria-label={t('wall.actions')}
            onClick={(event) => {
              setAnchor(event.currentTarget);
            }}
            size="small"
            data-wall-actions
          >
            <MoreHorizontal size={18} aria-hidden />
          </IconButton>
          <Menu
            anchorEl={anchor}
            open={anchor !== null}
            onClose={() => {
              setAnchor(null);
            }}
          >
            {!item.archived && (
              <MenuItem
                onClick={() => {
                  setAnchor(null);
                  setEditing(true);
                }}
              >
                {t('wall.edit')}
              </MenuItem>
            )}
            <MenuItem
              disabled={archive.isPending}
              onClick={() => {
                setAnchor(null);
                archive.mutate(!item.archived);
              }}
            >
              {t(item.archived ? 'wall.restore' : 'wall.archive')}
            </MenuItem>
          </Menu>
        </>
      }
    />
  );
}

/**
 * Правка записи: текст целиком берётся из первого сообщения темы — в карточке
 * только начало. Заголовок темы следует за первой строкой.
 */
function EditPost({
  topicId,
  onDone,
  onCancel,
}: {
  readonly topicId: string;
  readonly onDone: () => void;
  readonly onCancel: () => void;
}): ReactNode {
  const t = useT();
  const first = useQuery({
    queryKey: ['wall', 'edit', topicId],
    queryFn: () => listForumPosts(topicId, { page: 1, sort: 'OLD' }),
    select: (page) => page.items[0],
  });

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      {first.data === undefined ? (
        <RowsSkeleton rows={2} />
      ) : (
        <Composer
          initial={{ body: first.data.body, images: first.data.images }}
          submitLabel={t('wall.save')}
          submit={async (input) => {
            await updateForumPost(first.data?.id ?? '', {
              body: input.body,
              ...(input.images === undefined ? {} : { images: input.images }),
            });
            await renameForumTopic(topicId, {
              title: postTitle(input.body, t('feed.compose.fallbackTitle')),
            });
          }}
          onDone={onDone}
          onCancel={onCancel}
        />
      )}
    </Paper>
  );
}
