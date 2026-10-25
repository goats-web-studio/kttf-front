import type { ClubContentItem, CoachContentItem } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Play } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { z } from 'zod';

import { errorMessageKey } from '@/common/api';
import { formatDateTime, useLocale, useT, type MessageKey } from '@/common/i18n';
import EmptyState from '@/common/ui/empty-state';
import { BackLink } from '@/common/ui/page-header';
import Pagination from '@/common/ui/pagination';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { useSessionStore } from '@/features/auth/session-store';
import { hideContent } from '@/features/content/api';
import { contentImageVariant, hiddenNote, type ContentOwnerKind } from '@/features/content/owner';
import {
  clubContentFeedQuery,
  coachContentFeedQuery,
  contentKeys,
} from '@/features/content/queries';

const CONTENT_TABS = ['clubs', 'coaches'] as const;
type ContentTab = (typeof CONTENT_TABS)[number];

const searchSchema = z.object({
  tab: z.coerce.string().pipe(z.enum(CONTENT_TABS)).optional().catch(undefined),
  page: z.coerce.number().int().positive().catch(1),
});

export const Route = createFileRoute('/_app/admin/content')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: ContentPage,
});

const PAGE_SIZE = 20;

/** Чей контент на вкладке и тексты, где это названо. */
interface TabScope {
  readonly scope: ContentOwnerKind;
  readonly label: MessageKey;
  readonly lead: MessageKey;
  readonly empty: MessageKey;
  readonly reason: MessageKey;
}

const TAB_SCOPE: Readonly<Record<ContentTab, TabScope>> = {
  clubs: {
    scope: 'club',
    label: 'content.tab.clubs',
    lead: 'content.lead',
    empty: 'content.empty.text',
    reason: 'content.reason',
  },
  coaches: {
    scope: 'coach',
    label: 'content.tab.coaches',
    lead: 'content.coaches.lead',
    empty: 'content.coaches.empty',
    reason: 'content.coaches.reason',
  },
};

/** Строка ленты — общая для клуба и тренера: чьё и куда ведёт ссылка. */
interface ModerationItem {
  readonly kind: 'POST' | 'MEDIA';
  readonly id: string;
  readonly ownerName: string;
  readonly ownerHref: string;
  readonly createdAt: string;
  readonly title: string | null;
  readonly excerpt: string | null;
  readonly imageUrl: string | null;
  readonly youtubeId: string | null;
  readonly hidden: boolean;
  readonly hiddenReason: string | null;
}

function clubItem({ club, ...item }: ClubContentItem): ModerationItem {
  return { ...item, ownerName: club.name, ownerHref: `/clubs/${club.id}` };
}

function coachItem({ coach, ...item }: CoachContentItem): ModerationItem {
  return { ...item, ownerName: coach.name, ownerHref: `/coaches/${coach.slug}` };
}

/**
 * Контент клубов (ADR-055) и тренеров (ADR-059, T2.2) — постмодерация.
 *
 * Свежие записи и фото одной лентой на вкладку. Скрытое пропадает со
 * страницы, а клуб или тренер видит в кабинете причину. Вернуть — той же
 * кнопкой.
 */
function ContentPage(): ReactNode {
  const t = useT();
  const id = useId();
  const user = useSessionStore((state) => state.user);
  const { tab = 'clubs' } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <BackLink href="/cabinet" label={t('page.cabinet.title')} />
      <Typography variant="h1" sx={{ mt: 1 }}>
        {t('page.content.title')}
      </Typography>
      {user?.isAdmin === true ? (
        <>
          <Tabs
            value={tab}
            onChange={(_, next: ContentTab) => {
              void navigate({
                search: { tab: next === 'clubs' ? undefined : next, page: 1 },
                replace: true,
              });
            }}
            aria-label={t('page.content.title')}
            variant="scrollable"
            scrollButtons={false}
            sx={{ mt: 3 }}
          >
            {CONTENT_TABS.map((value) => (
              <Tab
                key={value}
                value={value}
                label={t(TAB_SCOPE[value].label)}
                id={`${id}-tab-${value}`}
                aria-controls={`${id}-panel`}
              />
            ))}
          </Tabs>
          <Box role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${tab}`}>
            <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 680 }}>
              {t(TAB_SCOPE[tab].lead)}
            </Typography>
            {tab === 'clubs' ? <ClubFeed /> : <CoachFeed />}
          </Box>
        </>
      ) : (
        <Box sx={{ mt: 3 }}>
          <EmptyState
            title={t('applications.forbidden.title')}
            text={t('places.forbidden.text')}
            action={<Button href="/cabinet">{t('page.cabinet.title')}</Button>}
          />
        </Box>
      )}
    </Container>
  );
}

function ClubFeed(): ReactNode {
  const { page } = Route.useSearch();
  const feed = useQuery(clubContentFeedQuery({ page, limit: PAGE_SIZE }));

  return <Feed tab="clubs" feed={feed} items={feed.data?.items.map(clubItem)} />;
}

function CoachFeed(): ReactNode {
  const { page } = Route.useSearch();
  const feed = useQuery(coachContentFeedQuery({ page, limit: PAGE_SIZE }));

  return <Feed tab="coaches" feed={feed} items={feed.data?.items.map(coachItem)} />;
}

interface FeedState {
  readonly isPending: boolean;
  readonly error: Error | null;
  readonly refetch: () => Promise<unknown>;
  readonly data?: { readonly total: number } | undefined;
}

function Feed({
  tab,
  feed,
  items,
}: {
  readonly tab: ContentTab;
  readonly feed: FeedState;
  readonly items: readonly ModerationItem[] | undefined;
}): ReactNode {
  const t = useT();
  const { page } = Route.useSearch();
  const navigate = Route.useNavigate();
  const pages = feed.data === undefined ? 1 : Math.max(1, Math.ceil(feed.data.total / PAGE_SIZE));
  const scope = TAB_SCOPE[tab];

  return (
    <Box sx={{ mt: 3 }}>
      <QueryState
        isPending={feed.isPending}
        error={feed.error}
        onRetry={() => void feed.refetch()}
        loading={<RowsSkeleton rows={3} />}
      >
        {items?.length === 0 ? (
          <EmptyState title={t('content.empty.title')} text={t(scope.empty)} />
        ) : (
          <Box sx={{ display: 'grid', gap: 1.5 }}>
            {(items ?? []).map((item) => (
              <ContentRow
                key={`${item.kind}-${item.id}`}
                scope={scope.scope}
                reasonLabel={scope.reason}
                item={item}
              />
            ))}
          </Box>
        )}
      </QueryState>
      <Pagination
        page={page}
        pages={pages}
        onPage={(next) => {
          void navigate({ search: (previous) => ({ ...previous, page: next }) });
        }}
      />
    </Box>
  );
}

function ContentRow({
  scope,
  reasonLabel,
  item,
}: {
  readonly scope: ContentOwnerKind;
  readonly reasonLabel: MessageKey;
  readonly item: ModerationItem;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const hide = useMutation({
    mutationFn: (hidden: boolean) =>
      hideContent(scope, item.kind, item.id, {
        hidden,
        reason: hidden && reason.trim() !== '' ? reason.trim() : null,
      }),
    onSuccess: async () => {
      setReason('');
      await queryClient.invalidateQueries({ queryKey: contentKeys.all });
    },
  });

  return (
    <Paper
      variant="outlined"
      data-content-item={item.id}
      sx={{
        p: 2,
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', sm: '160px 1fr' },
        opacity: item.hidden ? 0.75 : 1,
      }}
    >
      {item.imageUrl === null ? (
        <Box sx={{ display: { xs: 'none', sm: 'block' } }} />
      ) : (
        <Box sx={{ position: 'relative' }}>
          <Box
            component="img"
            src={contentImageVariant(item.imageUrl, 480)}
            alt=""
            loading="lazy"
            sx={{
              display: 'block',
              width: '100%',
              aspectRatio: '4 / 3',
              objectFit: 'cover',
              borderRadius: 2,
            }}
          />
          {item.youtubeId !== null && (
            <Box sx={{ position: 'absolute', left: 8, top: 8, color: 'var(--paper)' }}>
              <Play size={18} aria-hidden fill="currentColor" />
            </Box>
          )}
        </Box>
      )}
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" color="text.secondary">
          <Link href={item.ownerHref}>{item.ownerName}</Link>
          {' · '}
          {t(item.kind === 'POST' ? 'content.kind.post' : 'content.kind.media')}
          {' · '}
          {formatDateTime(item.createdAt, locale)}
        </Typography>
        {item.title !== null && (
          <Typography sx={{ mt: 0.5, fontWeight: 600 }}>{item.title}</Typography>
        )}
        {item.excerpt !== null && (
          <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-line' }}>
            {item.excerpt}
          </Typography>
        )}
        {item.hidden && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            {hiddenNote(t, item)}
          </Alert>
        )}
        <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          {!item.hidden && (
            <TextField
              size="small"
              label={t(reasonLabel)}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
              }}
              slotProps={{ htmlInput: { maxLength: 200 } }}
              sx={{ minWidth: { sm: 280 } }}
            />
          )}
          <Button
            variant="outlined"
            disabled={hide.isPending}
            onClick={() => {
              hide.mutate(!item.hidden);
            }}
            sx={{ minHeight: 40 }}
          >
            {t(item.hidden ? 'content.show' : 'content.hide')}
          </Button>
        </Box>
        {hide.error !== null && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {t(errorMessageKey(hide.error))}
          </Alert>
        )}
      </Box>
    </Paper>
  );
}
