import { type ForumPostSort, type ForumTopicView } from '@kttf/shared/types';
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
import Typography from '@mui/material/Typography';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Bell, BellOff, Eye, Lock, Pin, Shield } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { z } from 'zod';

import { errorMessageKey, isMissingResource } from '@/common/api';
import { fill, formatDate, useLocale, useT } from '@/common/i18n';
import { searchPage } from '@/common/search';
import EmptyState from '@/common/ui/empty-state';
import PageHeader from '@/common/ui/page-header';
import Pagination from '@/common/ui/pagination';
import PillTabs from '@/common/ui/pill-tabs';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import Surface from '@/common/ui/surface';
import { useSessionStore } from '@/features/auth/session-store';
import { contentImageVariant } from '@/features/content/owner';
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
  isNews,
  lastPage,
  ownerHref,
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

const searchSchema = z.object({
  page: searchPage,
  sort: z.enum(['OLD', 'NEW', 'TOP']).optional().catch(undefined),
});

export const Route = createFileRoute('/_public/forum/topics/$topicId')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: TopicPage,
});

/**
 * Порядок ответов по умолчанию (ADR-067 §1): разговор читается по порядку,
 * а в обсуждении турнира важно свежее — «опаздываю на 10 минут».
 */
function defaultSort(topic: ForumTopicView | undefined): ForumPostSort {
  return topic?.subject?.type === 'TOURNAMENT' ? 'NEW' : 'OLD';
}

/**
 * Тема форума — `docs/12` 5, ADR-067: первое сообщение «статьёй» со
 * счётчиком просмотров, ниже ответы по 20 с переключателем «по порядку /
 * новые / лучшие»; номер страницы и порядок — в адресе, `#post-N` — к
 * сообщению. Ответ внизу; «Цитировать» кладёт фрагмент в поле ответа.
 * Открытие темы гасит уведомления о ней и отметку «новые» (сервер).
 */
function TopicPage(): ReactNode {
  const t = useT();
  const { topicId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const page = search.page ?? 1;
  const topic = useQuery(forumTopicQuery(topicId));
  const sort = search.sort ?? defaultSort(topic.data);
  const replies = useQuery({ ...forumPostsQuery(topicId, page, sort), enabled: topic.isSuccess });
  const composer = useRef<HTMLTextAreaElement>(null);
  const [quote, setQuote] = useState<DraftQuote | null>(null);

  // К сообщению из адреса — когда страница с ним пришла.
  useEffect(() => {
    if (replies.data === undefined) return;

    const target = window.location.hash.slice(1);

    if (target.startsWith('post-')) {
      document.getElementById(target)?.scrollIntoView({ block: 'start' });
    }
  }, [replies.data]);

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
    replies.data === undefined
      ? 1
      : Math.max(1, Math.ceil(replies.data.total / replies.data.limit));
  const onQuote = (next: DraftQuote): void => {
    setQuote(next);
    composer.current?.scrollIntoView({ block: 'center' });
    composer.current?.focus({ preventScroll: true });
  };

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

      {data?.firstPost != null && (
        <Surface component="article">
          <PostCard
            post={data.firstPost}
            canReply={data.canReply}
            onQuote={onQuote}
            article
            header={isNews(data.subject) ? <NewsHeader topic={data} /> : undefined}
          />
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 0.75 }}
            data-forum-views
          >
            <Eye size={16} aria-hidden />
            {fill(t('forum.topic.views'), { count: String(data.viewsCount) })}
          </Typography>
        </Surface>
      )}

      {data !== undefined && data.postsCount > 1 && (
        <Box component="section" sx={{ mt: 4 }} aria-labelledby="forum-replies">
          <Box
            sx={{
              mb: 2,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography id="forum-replies" variant="h2">
              {fill(t('forum.topic.repliesTitle'), { count: String(data.postsCount - 1) })}
            </Typography>
            <PillTabs
              label={t('forum.replies.sort')}
              value={sort}
              options={[
                ['OLD', 'forum.replies.OLD'],
                ['NEW', 'forum.replies.NEW'],
                ['TOP', 'forum.replies.TOP'],
              ]}
              onChange={(next) => {
                void navigate({
                  search: { sort: next === defaultSort(data) ? undefined : next },
                  replace: true,
                });
              }}
            />
          </Box>
          <Surface>
            <QueryState
              isPending={replies.isPending}
              error={replies.error}
              onRetry={() => void replies.refetch()}
              loading={<RowsSkeleton />}
            >
              <Box data-forum-posts>
                {replies.data?.items.map((post) => (
                  <PostCard key={post.id} post={post} canReply={data.canReply} onQuote={onQuote} />
                ))}
              </Box>
            </QueryState>
          </Surface>
          <Pagination
            page={page}
            pages={pages}
            onPage={(next) => {
              void navigate({
                search: (previous) => ({ ...previous, page: next > 1 ? next : undefined }),
              });
              window.scrollTo({ top: 0 });
            }}
          />
        </Box>
      )}

      {data !== undefined && (
        <Box component="section" aria-label={t('forum.composer.title')} sx={{ mt: 3 }}>
          <WriteGate locked={!data.canReply && data.locked}>
            {data.canReply && (
              <Surface title={t('forum.composer.title')}>
                <Composer
                  ref={composer}
                  draftKey={`topic:${topicId}`}
                  quote={quote}
                  onClearQuote={() => {
                    setQuote(null);
                  }}
                  submit={async (input) => {
                    const created = await replyForumTopic(topicId, input);
                    await queryClient.invalidateQueries({ queryKey: forumKeys.all });
                    // Новый ответ: при «новых сверху» — первый, иначе — последний
                    // по порядку; туда и ведём.
                    const last = lastPage(created.number);

                    await navigate({
                      search:
                        sort === 'NEW'
                          ? { sort: search.sort }
                          : {
                              sort: sort === 'OLD' ? search.sort : 'OLD',
                              page: last > 1 ? last : undefined,
                            },
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

/**
 * Шапка статьи-новости (ADR-067 §2): чья новость — клуб или тренер ссылкой,
 * акция со сроком, картинка записи. Тот же вид, что на их странице.
 */
function NewsHeader({ topic }: { readonly topic: ForumTopicView }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const owner = topic.subject?.owner ?? null;
  const news = topic.subject?.news ?? null;

  if (owner === null || news === null) return null;

  return (
    <Box sx={{ mb: 2.5 }} data-forum-news-header>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        {owner.logoUrl !== null && (
          <Box
            component="img"
            src={contentImageVariant(owner.logoUrl, 480)}
            alt=""
            width={40}
            height={40}
            sx={{ width: 40, height: 40, borderRadius: 2, objectFit: 'cover' }}
          />
        )}
        <Link
          href={ownerHref(owner)}
          underline="hover"
          color="text.primary"
          sx={{ fontWeight: 600 }}
        >
          {owner.name}
        </Link>
        <Chip
          size="small"
          label={
            news.kind === 'PROMO'
              ? news.validUntil === null
                ? t('club.posts.promo')
                : fill(t('club.posts.promoUntil'), {
                    date: formatDate(`${news.validUntil}T12:00:00Z`, locale),
                  })
              : t('club.posts.news')
          }
          color={news.kind === 'PROMO' ? 'primary' : 'default'}
          variant={news.kind === 'PROMO' ? 'filled' : 'outlined'}
        />
      </Box>
      {news.imageUrl !== null && (
        <Box
          component="img"
          src={contentImageVariant(news.imageUrl, 960)}
          alt=""
          loading="lazy"
          sx={{ display: 'block', mt: 2, width: '100%', maxWidth: 720, borderRadius: 3 }}
        />
      )}
    </Box>
  );
}

/** Над заголовком: предмет темы ссылкой и состояние — закреплена, закрыта. */
function TopicBadges({ topic }: { readonly topic: ForumTopicView }): ReactNode {
  const t = useT();
  const chips: ReactNode[] = [];

  // У новости чей она — в шапке статьи; чип повторял бы заголовок.
  if (topic.subject !== null && !isNews(topic.subject)) {
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
