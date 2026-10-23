import { FORUM_QUOTE_MAX, type ForumPostView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from '@tanstack/react-router';
import { EllipsisVertical, Heart, Quote } from 'lucide-react';
import { useId, useRef, useState, type ReactNode } from 'react';

import { fill, formatDateTime, useLocale, useT } from '@/common/i18n';
import { authHref } from '@/features/auth/redirect';
import { useSessionStore } from '@/features/auth/session-store';

import {
  deleteForumPost,
  hideForumPost,
  muteForumUser,
  setForumLike,
  updateForumPost,
} from './api';
import AuthorLine from './author-line';
import Composer, { type DraftQuote } from './composer';
import { MuteDialog, ReasonDialog, ReportDialog } from './dialogs';
import { topicHref } from './labels';
import { ForumImages, ForumQuote, ForumText } from './post-body';
import { forumKeys } from './queries';

interface PostCardProps {
  readonly post: ForumPostView;
  /** Тема открыта для ответа этому человеку — тогда есть «Цитировать» и правка. */
  readonly canReply: boolean;
  readonly onQuote?: (quote: DraftQuote) => void;
}

/**
 * Сообщение форума: автор, номер-ссылка, текст с цитатой и фото, «нравится».
 * Удалённое автором и скрытое модератором остаются на своём номере
 * заглушкой — со скрытым видна причина (ADR-064 §5). Остальные действия —
 * в меню «…»: пожаловаться, изменить, удалить, у модератора — скрыть и
 * запретить писать.
 */
export default function PostCard({ post, canReply, onQuote }: PostCardProps): ReactNode {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const user = useSessionStore((state) => state.user);
  const textRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [dialog, setDialog] = useState<'report' | 'delete' | 'hide' | 'mute' | null>(null);

  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: forumKeys.all });
  };
  const isAdmin = user?.isAdmin === true;
  const removed = post.deleted || (post.hidden && post.body === '');
  const name = post.author?.name ?? t('forum.author.gone');

  const quote = (): void => {
    if (onQuote === undefined) return;

    // Выделенный фрагмент этого сообщения — его; иначе всё сообщение.
    const selection = window.getSelection();
    const selected =
      selection !== null &&
      !selection.isCollapsed &&
      textRef.current?.contains(selection.anchorNode ?? null) === true
        ? selection.toString().trim()
        : '';
    const text = (selected === '' ? post.body : selected).slice(0, FORUM_QUOTE_MAX).trim();

    onQuote({ postId: post.id, number: post.number, authorName: name, text });
  };

  return (
    <Box
      component="article"
      id={`post-${String(post.number)}`}
      data-forum-post={post.number}
      sx={{
        py: 2.5,
        scrollMarginTop: 96,
        borderTop: '1px solid var(--line)',
        '&:first-of-type': { borderTop: 0, pt: 0 },
        '&:last-of-type': { pb: 0 },
        '&:target': { bgcolor: 'var(--red-50)', mx: -2, px: 2, borderRadius: 2 },
      }}
    >
      <Box
        sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', justifyContent: 'space-between' }}
      >
        <AuthorLine
          author={post.author}
          meta={
            <Typography variant="body2" color="text.secondary">
              <Link href={topicHref(post.topicId, post.number)} color="inherit" underline="hover">
                #{post.number}
              </Link>
              {' · '}
              {formatDateTime(post.createdAt, locale)}
              {post.editedAt !== null && !post.deleted && ` · ${t('forum.post.edited')}`}
            </Typography>
          }
        />
        {!post.deleted && (
          <PostMenu
            post={post}
            canEdit={post.mine && !post.hidden && canReply}
            isAdmin={isAdmin}
            signedIn={user !== null}
            onPick={(action) => {
              if (action === 'edit') setEditing(true);
              else setDialog(action);
            }}
            onUnhide={async () => {
              await hideForumPost(post.id, { hidden: false });
              await refresh();
            }}
          />
        )}
      </Box>

      <Box sx={{ mt: 1.5, pl: { sm: 6 } }}>
        {post.deleted ? (
          <Placeholder>{t('forum.post.deleted')}</Placeholder>
        ) : editing ? (
          <Composer
            initial={{ body: post.body, images: post.images }}
            submitLabel={t('forum.action.save')}
            onCancel={() => {
              setEditing(false);
            }}
            onDone={() => {
              setEditing(false);
            }}
            submit={async (input) => {
              await updateForumPost(post.id, { body: input.body, images: input.images ?? [] });
              await refresh();
            }}
          />
        ) : (
          <>
            {post.hidden && (
              <Placeholder>
                {fill(t('forum.post.hidden'), { reason: post.hiddenReason ?? '' })}
              </Placeholder>
            )}
            {!removed && (
              <Box ref={textRef} sx={post.hidden ? { mt: 1.5, opacity: 0.7 } : undefined}>
                {post.quote !== null && (
                  <ForumQuote
                    quote={post.quote}
                    href={
                      post.quote.number === null ? null : topicHref(post.topicId, post.quote.number)
                    }
                  />
                )}
                <ForumText text={post.body} />
                <ForumImages images={post.images} />
              </Box>
            )}
          </>
        )}

        {!post.deleted && !post.hidden && !editing && (
          <Box sx={{ mt: 1.5, display: 'flex', gap: 0.5, alignItems: 'center', ml: -1 }}>
            <LikeButton post={post} signedIn={user !== null} />
            {canReply && onQuote !== undefined && (
              <Button
                variant="text"
                color="inherit"
                onClick={quote}
                startIcon={<Quote size={16} aria-hidden />}
                sx={{ minHeight: 44, color: 'text.secondary' }}
              >
                {t('forum.action.quote')}
              </Button>
            )}
          </Box>
        )}
      </Box>

      <ReportDialog
        postId={post.id}
        open={dialog === 'report'}
        onClose={() => {
          setDialog(null);
        }}
      />
      <ConfirmDelete
        open={dialog === 'delete'}
        onClose={() => {
          setDialog(null);
        }}
        onConfirm={async () => {
          await deleteForumPost(post.id);
          setDialog(null);
          await refresh();
        }}
      />
      <ReasonDialog
        open={dialog === 'hide'}
        title={t('forum.moderation.hidePost')}
        hint={t('forum.moderation.hidePostHint')}
        submitLabel={t('forum.moderation.hide')}
        onClose={() => {
          setDialog(null);
        }}
        onSubmit={async (reason) => {
          await hideForumPost(post.id, { hidden: true, reason });
          await refresh();
        }}
      />
      {post.author !== null && (
        <MuteDialog
          open={dialog === 'mute'}
          name={post.author.name}
          onClose={() => {
            setDialog(null);
          }}
          onSubmit={async (input) => {
            if (post.author !== null) await muteForumUser(post.author.userId, input);
          }}
        />
      )}
    </Box>
  );
}

function Placeholder({ children }: { readonly children: ReactNode }): ReactNode {
  return (
    <Typography
      data-forum-placeholder
      color="text.secondary"
      sx={{
        px: 2,
        py: 1.5,
        borderRadius: 2,
        bgcolor: 'var(--paper-sunken)',
        fontStyle: 'italic',
        maxWidth: 720,
      }}
    >
      {children}
    </Typography>
  );
}

/**
 * «Нравится» со счётчиком. Своё сообщение не отмечается — у автора только
 * число. Гостю кнопка ведёт на вход и возвращает сюда же.
 */
function LikeButton({
  post,
  signedIn,
}: {
  readonly post: ForumPostView;
  readonly signedIn: boolean;
}): ReactNode {
  const t = useT();
  const location = useLocation();
  const [state, setState] = useState({ likes: post.likes, liked: post.liked });
  const [pending, setPending] = useState(false);
  const label = fill(t(state.liked ? 'forum.action.unlike' : 'forum.action.like'), {
    count: String(state.likes),
  });
  const icon = (
    <Heart
      size={16}
      aria-hidden
      fill={state.liked ? 'var(--red-500)' : 'none'}
      color={state.liked ? 'var(--red-500)' : 'currentColor'}
    />
  );

  if (post.mine) {
    return state.likes === 0 ? null : (
      <Box
        sx={{
          display: 'inline-flex',
          gap: 0.75,
          alignItems: 'center',
          px: 1,
          color: 'text.secondary',
        }}
        aria-label={label}
      >
        {icon}
        <Typography variant="body2">{state.likes}</Typography>
      </Box>
    );
  }

  return (
    <Button
      variant="text"
      color="inherit"
      aria-pressed={state.liked}
      aria-label={label}
      startIcon={icon}
      disabled={pending}
      data-forum-like={state.liked}
      {...(signedIn
        ? {
            onClick: () => {
              setPending(true);
              setForumLike(post.id, !state.liked)
                .then(setState)
                .catch(() => undefined)
                .finally(() => {
                  setPending(false);
                });
            },
          }
        : { href: authHref('/login', location.href) })}
      sx={{ minHeight: 44, minWidth: 0, color: state.liked ? 'var(--red-700)' : 'text.secondary' }}
    >
      {state.likes > 0 ? state.likes : t('forum.action.likeShort')}
    </Button>
  );
}

type MenuAction = 'report' | 'edit' | 'delete' | 'hide' | 'mute';

function PostMenu({
  post,
  canEdit,
  isAdmin,
  signedIn,
  onPick,
  onUnhide,
}: {
  readonly post: ForumPostView;
  readonly canEdit: boolean;
  readonly isAdmin: boolean;
  readonly signedIn: boolean;
  readonly onPick: (action: MenuAction) => void;
  readonly onUnhide: () => Promise<void>;
}): ReactNode {
  const t = useT();
  const menuId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const items: { key: string; label: string; run: () => void }[] = [];
  const pick = (action: MenuAction) => () => {
    setAnchor(null);
    onPick(action);
  };

  if (signedIn && !post.mine && !post.hidden) {
    items.push({ key: 'report', label: t('forum.action.report'), run: pick('report') });
  }
  if (canEdit) items.push({ key: 'edit', label: t('forum.action.edit'), run: pick('edit') });
  if (post.mine)
    items.push({ key: 'delete', label: t('forum.action.delete'), run: pick('delete') });
  if (isAdmin) {
    items.push(
      post.hidden
        ? {
            key: 'unhide',
            label: t('forum.moderation.unhide'),
            run: () => {
              setAnchor(null);
              void onUnhide();
            },
          }
        : { key: 'hide', label: t('forum.moderation.hide'), run: pick('hide') },
    );
    if (post.author !== null && !post.mine && !post.author.moderator) {
      items.push({ key: 'mute', label: t('forum.mute.title'), run: pick('mute') });
    }
  }

  if (items.length === 0) return null;

  return (
    <>
      <IconButton
        aria-label={t('forum.action.more')}
        aria-controls={anchor === null ? undefined : menuId}
        aria-haspopup="menu"
        onClick={(event) => {
          setAnchor(event.currentTarget);
        }}
        sx={{ width: 44, height: 44, color: 'text.secondary', flexShrink: 0 }}
      >
        <EllipsisVertical size={18} aria-hidden />
      </IconButton>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => {
          setAnchor(null);
        }}
      >
        {items.map((item) => (
          <MenuItem key={item.key} onClick={item.run} sx={{ minHeight: 44 }}>
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

function ConfirmDelete({
  open,
  onClose,
  onConfirm,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => Promise<void>;
}): ReactNode {
  const t = useT();
  const [pending, setPending] = useState(false);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('forum.post.deleteConfirm')}</DialogTitle>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="text" onClick={onClose} sx={{ minHeight: 44 }}>
          {t('forum.action.cancel')}
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={pending}
          onClick={() => {
            setPending(true);
            void onConfirm().finally(() => {
              setPending(false);
            });
          }}
          sx={{ minHeight: 44 }}
        >
          {t('forum.action.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
