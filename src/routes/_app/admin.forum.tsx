import {
  FORUM_REPORT_STATUSES,
  FORUM_SUBJECT_TYPES,
  type ForumReportStatus,
  type ForumReportView,
  type ForumSectionView,
  type ForumSubjectType,
} from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Container from '@mui/material/Container';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';
import { z } from 'zod';

import { errorMessageKey } from '@/common/api';
import { fill, formatDate, formatDateTime, useLocale, useT, type MessageKey } from '@/common/i18n';
import EmptyState from '@/common/ui/empty-state';
import PageHeader from '@/common/ui/page-header';
import Pagination from '@/common/ui/pagination';
import PillTabs from '@/common/ui/pill-tabs';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import Surface from '@/common/ui/surface';
import { useSessionStore } from '@/features/auth/session-store';
import {
  createForumSection,
  hideForumPost,
  rejectForumReport,
  unmuteForumUser,
  updateForumSection,
} from '@/features/forum/api';
import AuthorLine from '@/features/forum/author-line';
import { ReasonDialog } from '@/features/forum/dialogs';
import { REPORT_REASON_KEYS, SUBJECT_KEYS, topicHref } from '@/features/forum/labels';
import { ForumText } from '@/features/forum/post-body';
import {
  adminForumSectionsQuery,
  forumKeys,
  forumMutesQuery,
  forumReportsQuery,
} from '@/features/forum/queries';

const TABS = ['reports', 'mutes', 'sections'] as const;
type ForumTab = (typeof TABS)[number];

const searchSchema = z.object({
  tab: z.coerce.string().pipe(z.enum(TABS)).optional().catch(undefined),
  status: z.coerce.string().pipe(z.enum(FORUM_REPORT_STATUSES)).optional().catch(undefined),
  page: z.coerce.number().int().positive().catch(1),
});

export const Route = createFileRoute('/_app/admin/forum')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: ForumModerationPage,
});

const TAB_KEYS: Readonly<Record<ForumTab, MessageKey>> = {
  reports: 'forum.admin.tab.reports',
  mutes: 'forum.admin.tab.mutes',
  sections: 'forum.admin.tab.sections',
};

const STATUS_KEYS: Readonly<Record<ForumReportStatus, MessageKey>> = {
  OPEN: 'forum.admin.status.OPEN',
  ACCEPTED: 'forum.admin.status.ACCEPTED',
  REJECTED: 'forum.admin.status.REJECTED',
};

/**
 * Модерация форума — ADR-064 §5, только администратор. Жалобы очередью:
 * скрыть сообщение с причиной (жалобы на него принимаются) или отклонить;
 * действующие запреты писать; разделы — завести, переименовать, в архив.
 */
function ForumModerationPage(): ReactNode {
  const t = useT();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const user = useSessionStore((state) => state.user);
  const tab = search.tab ?? 'reports';

  if (user?.isAdmin !== true) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 5, sm: 6 } }}>
        <EmptyState title={t('error.api.FORBIDDEN')} />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <PageHeader
        back={{ href: '/cabinet', label: t('page.cabinet.title') }}
        title={t('forum.admin.title')}
      />
      <Tabs
        value={tab}
        onChange={(_, next: ForumTab) => {
          void navigate({ search: { tab: next === 'reports' ? undefined : next, page: 1 } });
        }}
        sx={{ mb: 3 }}
        variant="scrollable"
      >
        {TABS.map((value) => (
          <Tab key={value} value={value} label={t(TAB_KEYS[value])} sx={{ minHeight: 48 }} />
        ))}
      </Tabs>
      {tab === 'reports' && <Reports status={search.status ?? 'OPEN'} page={search.page} />}
      {tab === 'mutes' && <Mutes page={search.page} />}
      {tab === 'sections' && <Sections />}
    </Container>
  );
}

function Reports({
  status,
  page,
}: {
  readonly status: ForumReportStatus;
  readonly page: number;
}): ReactNode {
  const t = useT();
  const navigate = Route.useNavigate();
  const reports = useQuery(forumReportsQuery({ status, page }));
  const pages =
    reports.data === undefined
      ? 1
      : Math.max(1, Math.ceil(reports.data.total / reports.data.limit));

  return (
    <>
      <Box sx={{ mb: 2 }}>
        <PillTabs
          label={t('forum.admin.status.label')}
          value={status}
          options={FORUM_REPORT_STATUSES.map((value) => [value, STATUS_KEYS[value]] as const)}
          onChange={(next) => {
            void navigate({
              search: (previous) => ({
                ...previous,
                status: next === 'OPEN' ? undefined : next,
                page: 1,
              }),
            });
          }}
        />
      </Box>
      <QueryState
        isPending={reports.isPending}
        error={reports.error}
        onRetry={() => void reports.refetch()}
        loading={<RowsSkeleton />}
      >
        {reports.data?.items.length === 0 ? (
          <EmptyState title={t('forum.admin.reports.empty')} />
        ) : (
          <Box sx={{ display: 'grid', gap: 2 }} data-forum-reports>
            {reports.data?.items.map((report) => (
              <ReportCard key={report.id} report={report} />
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
    </>
  );
}

function ReportCard({ report }: { readonly report: ForumReportView }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [hiding, setHiding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = (): Promise<void> => queryClient.invalidateQueries({ queryKey: forumKeys.all });

  return (
    <Surface component="article">
      <Typography variant="body2" color="text.secondary">
        {fill(t('forum.admin.reports.by'), {
          name: report.reporterName,
          reason: t(REPORT_REASON_KEYS[report.reason]),
          at: formatDateTime(report.createdAt, locale),
        })}
      </Typography>
      {report.comment !== null && (
        <Typography sx={{ mt: 0.5, fontStyle: 'italic' }}>«{report.comment}»</Typography>
      )}
      <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: 'var(--paper-sunken)' }}>
        <AuthorLine
          author={report.post.author}
          size="sm"
          meta={
            <Link href={topicHref(report.post.topic.id, report.post.number)} variant="body2">
              {report.post.topic.title} · #{report.post.number}
            </Link>
          }
        />
        <Box sx={{ mt: 1.5 }}>
          {report.post.deleted ? (
            <Typography color="text.secondary">{t('forum.post.deleted')}</Typography>
          ) : (
            <ForumText text={report.post.body} />
          )}
        </Box>
        {report.post.hidden && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {fill(t('forum.post.hidden'), { reason: report.post.hiddenReason ?? '' })}
          </Typography>
        )}
      </Box>
      {error !== null && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      {report.status === 'OPEN' && (
        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {!report.post.hidden && !report.post.deleted && (
            <Button
              variant="contained"
              onClick={() => {
                setHiding(true);
              }}
              sx={{ minHeight: 44 }}
            >
              {t('forum.moderation.hide')}
            </Button>
          )}
          <Button
            variant="outlined"
            onClick={() => {
              rejectForumReport(report.id)
                .then(refresh)
                .catch((caught: unknown) => {
                  setError(t(errorMessageKey(caught)));
                });
            }}
            sx={{ minHeight: 44 }}
          >
            {t('forum.admin.reports.reject')}
          </Button>
        </Box>
      )}
      <ReasonDialog
        open={hiding}
        title={t('forum.moderation.hidePost')}
        hint={t('forum.moderation.hidePostHint')}
        submitLabel={t('forum.moderation.hide')}
        onClose={() => {
          setHiding(false);
        }}
        onSubmit={async (reason) => {
          await hideForumPost(report.post.id, { hidden: true, reason });
          await refresh();
        }}
      />
    </Surface>
  );
}

function Mutes({ page }: { readonly page: number }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const mutes = useQuery(forumMutesQuery({ page, limit: 20 }));
  const pages =
    mutes.data === undefined ? 1 : Math.max(1, Math.ceil(mutes.data.total / mutes.data.limit));

  return (
    <QueryState
      isPending={mutes.isPending}
      error={mutes.error}
      onRetry={() => void mutes.refetch()}
      loading={<RowsSkeleton />}
    >
      {mutes.data?.items.length === 0 ? (
        <EmptyState title={t('forum.admin.mutes.empty')} text={t('forum.admin.mutes.hint')} />
      ) : (
        <Surface flush>
          <Box component="ul" sx={{ m: 0, p: 0 }}>
            {mutes.data?.items.map((mute) => (
              <Box
                component="li"
                key={mute.user.userId}
                sx={{
                  listStyle: 'none',
                  px: 2.5,
                  py: 2,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 2,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--line)',
                  '&:first-of-type': { borderTop: 0 },
                }}
              >
                <AuthorLine
                  author={mute.user}
                  meta={
                    <Typography variant="body2" color="text.secondary">
                      {fill(t('forum.admin.mutes.until'), {
                        until: formatDate(mute.until, locale),
                        reason: mute.reason,
                      })}
                    </Typography>
                  }
                />
                <Button
                  variant="outlined"
                  onClick={() => {
                    void unmuteForumUser(mute.user.userId).then(() =>
                      queryClient.invalidateQueries({ queryKey: forumKeys.all }),
                    );
                  }}
                  sx={{ minHeight: 44 }}
                >
                  {t('forum.admin.mutes.lift')}
                </Button>
              </Box>
            ))}
          </Box>
        </Surface>
      )}
      <Pagination
        page={page}
        pages={pages}
        onPage={(next) => {
          void navigate({ search: (previous) => ({ ...previous, page: next }) });
        }}
      />
    </QueryState>
  );
}

function Sections(): ReactNode {
  const t = useT();
  const sections = useQuery(adminForumSectionsQuery);
  const [creating, setCreating] = useState(false);

  return (
    <QueryState
      isPending={sections.isPending}
      error={sections.error}
      onRetry={() => void sections.refetch()}
      loading={<RowsSkeleton />}
    >
      <Box sx={{ display: 'grid', gap: 2 }}>
        {sections.data?.map((section) => (
          <SectionEditor key={section.id} section={section} />
        ))}
        {creating ? (
          <SectionEditor
            section={null}
            onDone={() => {
              setCreating(false);
            }}
          />
        ) : (
          <Box>
            <Button
              variant="outlined"
              onClick={() => {
                setCreating(true);
              }}
              sx={{ minHeight: 44 }}
            >
              {t('forum.admin.sections.add')}
            </Button>
          </Box>
        )}
      </Box>
    </QueryState>
  );
}

/** Раздел: адрес, название, описание, порядок, тип предмета; архив — кнопкой. */
function SectionEditor({
  section,
  onDone,
}: {
  readonly section: ForumSectionView | null;
  readonly onDone?: () => void;
}): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const [slug, setSlug] = useState(section?.slug ?? '');
  const [title, setTitle] = useState(section?.title ?? '');
  const [description, setDescription] = useState(section?.description ?? '');
  const [position, setPosition] = useState(String(section?.position ?? 100));
  const [subjectTypes, setSubjectTypes] = useState<ForumSubjectType[]>(
    section === null ? [] : [...section.subjectTypes],
  );
  const [manualTopics, setManualTopics] = useState(section?.manualTopics ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const fields = {
    slug,
    title: title.trim(),
    description: description.trim() === '' ? null : description.trim(),
    position: Number.parseInt(position, 10) || 0,
    subjectTypes,
    manualTopics,
  };
  const save = async (extra: { archived?: boolean } = {}): Promise<void> => {
    setError(null);
    setSaved(false);
    try {
      if (section === null) await createForumSection(fields);
      else await updateForumSection(section.id, { ...fields, ...extra });
      await queryClient.invalidateQueries({ queryKey: forumKeys.all });
      setSaved(true);
      onDone?.();
    } catch (caught) {
      setError(t(errorMessageKey(caught)));
    }
  };

  return (
    <Surface
      component="article"
      title={section === null ? t('forum.admin.sections.new') : section.title}
      {...(section === null
        ? {}
        : {
            subtitle: section.archived
              ? t('forum.admin.sections.archived')
              : fill(t('forum.section.counts'), {
                  topics: String(section.topicsCount),
                  posts: String(section.postsCount),
                }),
          })}
    >
      <Box
        component="form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, minmax(0, 1fr))' },
        }}
      >
        <TextField
          label={t('forum.admin.sections.slug')}
          value={slug}
          onChange={(event) => {
            setSlug(event.target.value.toLowerCase());
          }}
          required
        />
        <TextField
          label={t('forum.admin.sections.titleLabel')}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
          }}
          required
          sx={{ gridColumn: { sm: 'span 2' } }}
        />
        <TextField
          label={t('forum.admin.sections.position')}
          value={position}
          onChange={(event) => {
            setPosition(event.target.value.replace(/\D/g, ''));
          }}
          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
        />
        <TextField
          label={t('forum.admin.sections.description')}
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
          }}
          sx={{ gridColumn: { sm: 'span 3' } }}
          slotProps={{ htmlInput: { maxLength: 300 } }}
        />
        <TextField
          select
          label={t('forum.admin.sections.subject')}
          value={subjectTypes}
          onChange={(event) => {
            const value = event.target.value as unknown;

            setSubjectTypes(
              (Array.isArray(value) ? value : [value]).filter((item): item is ForumSubjectType =>
                FORUM_SUBJECT_TYPES.some((type) => type === item),
              ),
            );
          }}
          slotProps={{
            select: {
              multiple: true,
              renderValue: (value) =>
                (value as ForumSubjectType[]).length === 0
                  ? t('forum.admin.sections.noSubject')
                  : (value as ForumSubjectType[]).map((type) => t(SUBJECT_KEYS[type])).join(', '),
              displayEmpty: true,
            },
          }}
        >
          {FORUM_SUBJECT_TYPES.map((type) => (
            <MenuItem key={type} value={type} sx={{ minHeight: 44 }}>
              {t(SUBJECT_KEYS[type])}
            </MenuItem>
          ))}
        </TextField>
        <FormControlLabel
          control={
            <Checkbox
              checked={manualTopics}
              onChange={(event) => {
                setManualTopics(event.target.checked);
              }}
            />
          }
          label={t('forum.admin.sections.manualTopics')}
          sx={{ gridColumn: { sm: 'span 2' }, minHeight: 44 }}
        />
        <Box
          sx={{
            gridColumn: '1 / -1',
            display: 'flex',
            gap: 1,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <Button type="submit" variant="contained" sx={{ minHeight: 44 }}>
            {t('forum.action.save')}
          </Button>
          {section !== null && (
            <Button
              variant="text"
              onClick={() => {
                void save({ archived: !section.archived });
              }}
              sx={{ minHeight: 44 }}
            >
              {t(
                section.archived ? 'forum.admin.sections.restore' : 'forum.admin.sections.archive',
              )}
            </Button>
          )}
          {onDone !== undefined && (
            <Button variant="text" onClick={onDone} sx={{ minHeight: 44 }}>
              {t('forum.action.cancel')}
            </Button>
          )}
          {saved && (
            <Typography variant="body2" color="text.secondary" role="status">
              {t('forum.admin.sections.saved')}
            </Typography>
          )}
        </Box>
        {error !== null && (
          <Alert severity="error" sx={{ gridColumn: '1 / -1' }}>
            {error}
          </Alert>
        )}
      </Box>
    </Surface>
  );
}
