import type { ForumTopicView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Link from '@mui/material/Link';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Bell, BellOff, Lock, Pin, Shield } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { z } from 'zod';

import { errorMessageKey, isMissingResource } from '@/common/api';
import { fill, useT } from '@/common/i18n';
import { searchPage } from '@/common/search';
import EmptyState from '@/common/ui/empty-state';
import PageHeader from '@/common/ui/page-header';
import Pagination from '@/common/ui/pagination';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import Surface from '@/common/ui/surface';
import { useSessionStore } from '@/features/auth/session-store';
import {
  moderateForumTopic,
  renameForumTopic,
  replyForumTopic,
  setForumSubscription,
} from '@/features/forum/api';
import Composer, { WriteGate, type DraftQuote } from '@/features/forum/composer';
import { ReasonDialog } from '@/features/forum/dialogs';
import {
  FORUM_HREF,
  lastPage,
  sectionHref,
  subjectHref,
  SUBJECT_KEYS,
} from '@/features/forum/labels';
import PostCard from '@/features/forum/post-card';
import {
  forumKeys,
  forumPostsQuery,
  forumSectionsQuery,
  forumTopicQuery,
} from '@/features/forum/queries';

const searchSchema = z.object({ page: searchPage });

export const Route = createFileRoute('/_public/forum/topics/$topicId')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: TopicPage,
});

/**
 * Тема форума — `docs/12` 5. Сообщения по 20, номер страницы в адресе,
 * `#post-N` — к сообщению. Ответ внизу; «Цитировать» у сообщения кладёт
 * выделенный фрагмент в поле ответа. Открытие темы гасит уведомления о ней
 * (сервер). У модератора — закрепить, закрыть, перенести, скрыть.
 */
function TopicPage(): ReactNode {
  const t = useT();
  const { topicId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const page = search.page ?? 1;
  const topic = useQuery(forumTopicQuery(topicId));
  const posts = useQuery(forumPostsQuery(topicId, page));
  const composer = useRef<HTMLTextAreaElement>(null);
  const [quote, setQuote] = useState<DraftQuote | null>(null);

  // К сообщению из адреса — когда страница с ним пришла.
  useEffect(() => {
    if (posts.data === undefined) return;

    const target = window.location.hash.slice(1);

    if (target.startsWith('post-')) {
      document.getElementById(target)?.scrollIntoView({ block: 'start' });
    }
  }, [posts.data]);

  if (topic.error !== null && isMissingResource(topic.error)) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 5, sm: 6 } }}>
        <EmptyState
          title={t('forum.topic.notFound')}
          action={<Button href={FORUM_HREF}>{t('page.forum.title')}</Button>}
        />
      </Container>
    );
  }

  const data = topic.data;
  const pages =
    posts.data === undefined ? 1 : Math.max(1, Math.ceil(posts.data.total / posts.data.limit));

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <QueryState
        isPending={topic.isPending}
        error={topic.error}
        onRetry={() => void topic.refetch()}
        loading={<RowsSkeleton rows={2} />}
      >
        {data !== undefined && (
          <PageHeader
            back={{ href: sectionHref(data.section.slug), label: data.section.title }}
            eyebrow={<TopicBadges topic={data} />}
            title={
              <Box component="span" sx={{ overflowWrap: 'anywhere' }}>
                {data.title}
              </Box>
            }
            actions={<TopicActions topic={data} />}
          />
        )}
      </QueryState>

      {data?.hidden === true && (
        <Alert severity="warning" icon={false} sx={{ mb: 2 }}>
          {fill(t('forum.topic.hiddenNote'), { reason: data.hiddenReason ?? '' })}
        </Alert>
      )}

      <Surface>
        <QueryState
          isPending={posts.isPending}
          error={posts.error}
          onRetry={() => void posts.refetch()}
          loading={<RowsSkeleton />}
        >
          <Box data-forum-posts>
            {posts.data?.items.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                canReply={data?.canReply === true}
                onQuote={(next) => {
                  setQuote(next);
                  composer.current?.scrollIntoView({ block: 'center' });
                  composer.current?.focus({ preventScroll: true });
                }}
              />
            ))}
          </Box>
        </QueryState>
      </Surface>

      <Pagination
        page={page}
        pages={pages}
        onPage={(next) => {
          void navigate({ search: { page: next > 1 ? next : undefined } });
          window.scrollTo({ top: 0 });
        }}
      />

      {data !== undefined && (
        <Box component="section" aria-label={t('forum.composer.title')} sx={{ mt: 3 }}>
          <WriteGate locked={!data.canReply && data.locked}>
            {data.canReply && (
              <Surface title={t('forum.composer.title')}>
                <Composer
                  ref={composer}
                  quote={quote}
                  onClearQuote={() => {
                    setQuote(null);
                  }}
                  submit={async (input) => {
                    const created = await replyForumTopic(topicId, input);
                    await queryClient.invalidateQueries({ queryKey: forumKeys.all });
                    // Новое сообщение — на последней странице, к нему и ведём.
                    const last = lastPage(created.number);

                    await navigate({
                      search: { page: last > 1 ? last : undefined },
                      hash: `post-${String(created.number)}`,
                    });
                  }}
                />
              </Surface>
            )}
          </WriteGate>
        </Box>
      )}
    </Container>
  );
}

/** Над заголовком: предмет темы ссылкой и состояние — закреплена, закрыта. */
function TopicBadges({ topic }: { readonly topic: ForumTopicView }): ReactNode {
  const t = useT();
  const chips: ReactNode[] = [];

  if (topic.subject !== null) {
    chips.push(
      <Chip
        key="subject"
        component="a"
        href={subjectHref(topic.subject)}
        clickable
        variant="outlined"
        label={`${t(SUBJECT_KEYS[topic.subject.type])}: ${topic.subject.name}`}
        data-forum-subject={topic.subject.type}
      />,
    );
  }
  if (topic.pinned) {
    chips.push(
      <Chip key="pin" icon={<Pin size={14} aria-hidden />} label={t('forum.topic.pinned')} />,
    );
  }
  if (topic.locked) {
    chips.push(
      <Chip key="lock" icon={<Lock size={14} aria-hidden />} label={t('forum.topic.locked')} />,
    );
  }

  return chips.length === 0 ? undefined : (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>{chips}</Box>
  );
}

/** Подписка, переименование, у модератора — меню темы. */
function TopicActions({ topic }: { readonly topic: ForumTopicView }): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const user = useSessionStore((state) => state.user);
  const subscribed = topic.subscribed;
  const [pending, setPending] = useState(false);
  const [dialog, setDialog] = useState<'rename' | 'move' | 'hide' | null>(null);

  if (user === null) return undefined;

  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: forumKeys.all });
  };
  const moderate = async (input: Parameters<typeof moderateForumTopic>[1]): Promise<void> => {
    await moderateForumTopic(topic.id, input);
    await refresh();
  };

  return (
    <>
      <Button
        variant="outlined"
        disabled={pending}
        aria-pressed={subscribed}
        startIcon={subscribed ? <BellOff size={18} aria-hidden /> : <Bell size={18} aria-hidden />}
        onClick={() => {
          setPending(true);
          setForumSubscription(topic.id, !subscribed)
            .then(() => queryClient.invalidateQueries({ queryKey: forumKeys.topic(topic.id) }))
            .catch(() => undefined)
            .finally(() => {
              setPending(false);
            });
        }}
        sx={{ minHeight: 44 }}
        data-forum-subscribe={subscribed}
      >
        {t(subscribed ? 'forum.topic.unsubscribe' : 'forum.topic.subscribe')}
      </Button>
      {topic.canRename && !user.isAdmin && (
        <Button
          variant="text"
          onClick={() => {
            setDialog('rename');
          }}
          sx={{ minHeight: 44 }}
        >
          {t('forum.topic.rename')}
        </Button>
      )}
      {user.isAdmin && (
        <ModeratorMenu
          topic={topic}
          onPick={(action) => {
            if (action === 'pin') void moderate({ pinned: !topic.pinned });
            else if (action === 'lock') void moderate({ locked: !topic.locked });
            else if (action === 'unhide') void moderate({ hidden: false });
            else setDialog(action);
          }}
        />
      )}

      <RenameDialog
        open={dialog === 'rename'}
        initial={topic.title}
        onClose={() => {
          setDialog(null);
        }}
        onSubmit={async (title) => {
          if (user.isAdmin) await moderate({ title });
          else {
            await renameForumTopic(topic.id, { title });
            await refresh();
          }
        }}
      />
      <MoveDialog
        open={dialog === 'move'}
        current={topic.section.id}
        onClose={() => {
          setDialog(null);
        }}
        onSubmit={(sectionId) => moderate({ sectionId })}
      />
      <ReasonDialog
        open={dialog === 'hide'}
        title={t('forum.moderation.hideTopic')}
        hint={t('forum.moderation.hideTopicHint')}
        submitLabel={t('forum.moderation.hide')}
        onClose={() => {
          setDialog(null);
        }}
        onSubmit={(reason) => moderate({ hidden: true, reason })}
      />
    </>
  );
}

type TopicAction = 'pin' | 'lock' | 'rename' | 'move' | 'hide' | 'unhide';

function ModeratorMenu({
  topic,
  onPick,
}: {
  readonly topic: ForumTopicView;
  readonly onPick: (action: TopicAction) => void;
}): ReactNode {
  const t = useT();
  const menuId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const items: [TopicAction, string][] = [
    ['pin', t(topic.pinned ? 'forum.moderation.unpin' : 'forum.moderation.pin')],
    ['lock', t(topic.locked ? 'forum.moderation.unlock' : 'forum.moderation.lock')],
    ['rename', t('forum.topic.rename')],
    ['move', t('forum.moderation.move')],
    topic.hidden ? ['unhide', t('forum.moderation.unhide')] : ['hide', t('forum.moderation.hide')],
  ];

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<Shield size={18} aria-hidden />}
        aria-controls={anchor === null ? undefined : menuId}
        aria-haspopup="menu"
        onClick={(event) => {
          setAnchor(event.currentTarget);
        }}
        sx={{ minHeight: 44 }}
      >
        {t('forum.moderation.menu')}
      </Button>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => {
          setAnchor(null);
        }}
      >
        {items.map(([action, label]) => (
          <MenuItem
            key={action}
            onClick={() => {
              setAnchor(null);
              onPick(action);
            }}
            sx={{ minHeight: 44 }}
          >
            {label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

function RenameDialog({
  open,
  initial,
  onClose,
  onSubmit,
}: {
  readonly open: boolean;
  readonly initial: string;
  readonly onClose: () => void;
  readonly onSubmit: (title: string) => Promise<void>;
}): ReactNode {
  const t = useT();
  const [title, setTitle] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const valid = title.trim().length >= 3;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!valid) return;
          onSubmit(title.trim())
            .then(onClose)
            .catch((caught: unknown) => {
              setError(t(errorMessageKey(caught)));
            });
        }}
      >
        <DialogTitle>{t('forum.topic.rename')}</DialogTitle>
        <DialogContent>
          <TextField
            label={t('forum.new.titleLabel')}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
            }}
            fullWidth
            autoFocus
            sx={{ mt: 1 }}
            slotProps={{ htmlInput: { maxLength: 150 } }}
          />
          {error !== null && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="text" onClick={onClose} sx={{ minHeight: 44 }}>
            {t('forum.action.cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={!valid} sx={{ minHeight: 44 }}>
            {t('forum.action.save')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function MoveDialog({
  open,
  current,
  onClose,
  onSubmit,
}: {
  readonly open: boolean;
  readonly current: string;
  readonly onClose: () => void;
  readonly onSubmit: (sectionId: string) => Promise<void>;
}): ReactNode {
  const t = useT();
  const sections = useQuery({ ...forumSectionsQuery, enabled: open });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('forum.moderation.move')}</DialogTitle>
      <Box component="ul" sx={{ m: 0, px: 1, pb: 2 }}>
        {sections.data?.map((section) => (
          <Box component="li" key={section.id} sx={{ listStyle: 'none' }}>
            <Link
              component="button"
              type="button"
              underline="none"
              color={section.id === current ? 'text.secondary' : 'text.primary'}
              disabled={section.id === current}
              onClick={() => {
                void onSubmit(section.id).then(onClose);
              }}
              sx={{ display: 'block', width: '100%', textAlign: 'left', px: 2, minHeight: 44 }}
            >
              {section.title}
            </Link>
          </Box>
        ))}
      </Box>
    </Dialog>
  );
}
