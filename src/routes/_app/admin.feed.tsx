import { FEED_PORTAL_SECTION, FORUM_TOPIC_TITLE_MAX, type FeedItem } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Eye, EyeOff, Pin, PinOff } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { useT, type MessageKey } from '@/common/i18n';
import EmptyState from '@/common/ui/empty-state';
import Pagination from '@/common/ui/pagination';
import PillTabs from '@/common/ui/pill-tabs';
import { RowsSkeleton } from '@/common/ui/skeleton';
import Surface from '@/common/ui/surface';
import { useSessionStore } from '@/features/auth/session-store';
import { curateFeed, fetchAdminFeed } from '@/features/feed/api';
import FeedCard from '@/features/feed/feed-card';
import { feedKeys } from '@/features/feed/queries';
import { createForumTopic } from '@/features/forum/api';
import Composer from '@/features/forum/composer';
import { forumKeys, forumSectionsQuery } from '@/features/forum/queries';

export const Route = createFileRoute('/_app/admin/feed')({
  component: AdminFeedPage,
});

type Filter = 'ALL' | 'PINNED' | 'HIDDEN';

const FILTERS: readonly (readonly [Filter, MessageKey])[] = [
  ['ALL', 'admin.feed.all'],
  ['PINNED', 'admin.feed.pinned'],
  ['HIDDEN', 'admin.feed.hidden'],
];

const PAGE = 20;

/**
 * Управление лентой — ADR-075. Новость KTTF — тема раздела «Новости KTTF»,
 * писать туда может только администратор. Любую карточку можно закрепить
 * над лентой или скрыть из неё; скрытая остаётся на своём месте — на
 * странице клуба, в профиле, на форуме: решение касается только ленты.
 */
function AdminFeedPage(): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const admin = useSessionStore((state) => state.user?.isAdmin ?? false);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [page, setPage] = useState(1);
  const list = useQuery({
    queryKey: ['feed', 'admin', filter, page] as const,
    queryFn: () =>
      fetchAdminFeed({ page, limit: PAGE, ...(filter === 'ALL' ? {} : { only: filter }) }),
    enabled: admin,
    placeholderData: keepPreviousData,
  });

  const curate = useMutation({
    mutationFn: curateFeed,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: feedKeys.all });
    },
  });

  if (!admin) {
    return (
      <Container maxWidth="lg" component="section">
        <EmptyState title={t('admin.forbidden')} />
      </Container>
    );
  }

  const pages = list.data === undefined ? 1 : Math.max(1, Math.ceil(list.data.total / PAGE));

  return (
    <Container maxWidth="lg" component="section">
      <Typography variant="h1">{t('admin.nav.feed')}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
        {t('admin.feed.lead')}
      </Typography>

      <Stack spacing={3}>
        <PortalNews
          onPublished={() => {
            void queryClient.invalidateQueries({ queryKey: feedKeys.all });
            void queryClient.invalidateQueries({ queryKey: forumKeys.all });
          }}
        />

        <Box>
          <PillTabs
            value={filter}
            options={FILTERS}
            label={t('admin.nav.feed')}
            onChange={(next) => {
              setFilter(next);
              setPage(1);
            }}
          />
        </Box>

        {list.isPending ? (
          <RowsSkeleton rows={4} />
        ) : (list.data?.items.length ?? 0) === 0 ? (
          <EmptyState title={t('admin.feed.empty')} />
        ) : (
          <Stack spacing={2}>
            {list.data?.items.map((item) => (
              <FeedCard
                key={item.id}
                item={item}
                actions={
                  <CurationButtons
                    item={item}
                    busy={curate.isPending}
                    onCurate={(change) => {
                      curate.mutate({ itemId: item.id, ...change });
                    }}
                  />
                }
              />
            ))}
          </Stack>
        )}

        <Pagination page={page} pages={pages} onPage={setPage} />
      </Stack>
    </Container>
  );
}

function CurationButtons({
  item,
  busy,
  onCurate,
}: {
  readonly item: FeedItem;
  readonly busy: boolean;
  readonly onCurate: (change: { pinned?: boolean; hidden?: boolean }) => void;
}): ReactNode {
  const t = useT();

  return (
    <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }} data-curation>
      <Button
        size="small"
        variant="text"
        disabled={busy || item.hidden}
        startIcon={item.pinned ? <PinOff size={16} aria-hidden /> : <Pin size={16} aria-hidden />}
        onClick={() => {
          onCurate({ pinned: !item.pinned });
        }}
      >
        {t(item.pinned ? 'admin.feed.unpin' : 'admin.feed.pin')}
      </Button>
      <Button
        size="small"
        variant="text"
        disabled={busy}
        startIcon={item.hidden ? <Eye size={16} aria-hidden /> : <EyeOff size={16} aria-hidden />}
        onClick={() => {
          onCurate({ hidden: !item.hidden, ...(item.hidden ? {} : { pinned: false }) });
        }}
      >
        {t(item.hidden ? 'admin.feed.show' : 'admin.feed.hide')}
      </Button>
    </Stack>
  );
}

/** Новость KTTF: заголовок и текст с фото — тема раздела «Новости KTTF». */
function PortalNews({ onPublished }: { readonly onPublished: () => void }): ReactNode {
  const t = useT();
  const sections = useQuery(forumSectionsQuery);
  const section = sections.data?.find((row) => row.slug === FEED_PORTAL_SECTION);
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState(false);

  if (section === undefined) return null;

  return (
    <Surface title={t('admin.feed.news')} subtitle={t('admin.feed.newsLead')}>
      <TextField
        label={t('admin.feed.newsTitle')}
        value={title}
        error={titleError}
        fullWidth
        slotProps={{ htmlInput: { maxLength: FORUM_TOPIC_TITLE_MAX } }}
        onChange={(event) => {
          setTitle(event.target.value);
          setTitleError(false);
        }}
        sx={{ mb: 2 }}
      />
      <Composer
        draftKey="admin-portal-news"
        submitLabel={t('admin.feed.publish')}
        validate={() => {
          const ok = title.trim().length >= 3;
          setTitleError(!ok);
          return ok;
        }}
        submit={(input) =>
          createForumTopic({
            sectionId: section.id,
            title: title.trim(),
            body: input.body,
            ...(input.images === undefined ? {} : { images: input.images }),
          })
        }
        onDone={() => {
          setTitle('');
          onPublished();
        }}
      />
    </Surface>
  );
}
