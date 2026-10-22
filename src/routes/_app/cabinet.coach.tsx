import {
  canSubmitCoach,
  coachLimits,
  coachMissing,
  isCoachPublic,
  type CoachStatus,
  type CoachView,
} from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { ExternalLink, Send } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { z } from 'zod';

import { errorMessageKey, isMissingResource } from '@/common/api';
import { fill, useT, type MessageKey } from '@/common/i18n';
import EmptyState from '@/common/ui/empty-state';
import { BackLink } from '@/common/ui/page-header';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { reloadUser } from '@/features/auth/session';
import { useSessionStore } from '@/features/auth/session-store';
import { submitCoach } from '@/features/coaches/api';
import { useBecomeCoach } from '@/features/coaches/become';
import CoachFreshnessPanel from '@/features/coaches/editor/freshness-panel';
import CoachImagesEditor from '@/features/coaches/editor/images-editor';
import CoachPageEditor from '@/features/coaches/editor/page-editor';
import CoachQualificationEditor from '@/features/coaches/editor/qualification-editor';
import CoachTrainingsTab from '@/features/coaches/editor/trainings-tab';
import CoachClubsTab from '@/features/coaches/staff/coach-clubs-tab';
import CoachStudentsTab from '@/features/coaches/staff/coach-students-tab';
import MediaEditor from '@/features/content/media-editor';
import { coachOwner } from '@/features/content/owner';
import PostsEditor from '@/features/content/posts-editor';
import CoachStatsPanel from '@/features/coaches/editor/stats-panel';
import { COACH_REQUIREMENT_KEYS, coachFullName } from '@/features/coaches/labels';
import { coachKeys, coachQuery } from '@/features/coaches/queries';
import CoachStatusPlate from '@/features/coaches/status-plate';
import { coachInbox } from '@/features/trial-requests/inbox';
import TrialInboxPanel from '@/features/trial-requests/inbox-panel';
import { useNewTrialRequests } from '@/features/trial-requests/new-count';

/**
 * Вкладки повторяют блоки страницы (`docs/11` 5.4): форма — сама страница
 * тренера. «Клубы» — этап T2, «Заявки» на пробную с сайта — T3. Вкладка
 * и, у администратора, чья страница — в адресе.
 */
const COACH_TABS = [
  'page',
  'trainings',
  'requests',
  'qualification',
  'posts',
  'media',
  'clubs',
  'students',
  'stats',
] as const;
type CoachTab = (typeof COACH_TABS)[number];

const TAB_LABELS: Readonly<Record<CoachTab, MessageKey>> = {
  page: 'coach.tab.page',
  trainings: 'coach.tab.services',
  requests: 'trial.tab',
  clubs: 'coach.tab.clubs',
  students: 'coach.tab.students',
  qualification: 'coach.tab.qualification',
  posts: 'coach.tab.posts',
  media: 'coach.tab.media',
  stats: 'manage.stats.title',
};

/** Что значит статус и что делать дальше — под плашкой статуса. */
const STATUS_HINTS: Readonly<Record<CoachStatus, MessageKey>> = {
  DRAFT: 'coach.state.draftHint',
  PENDING: 'coach.state.pendingHint',
  APPROVED: 'coach.state.publishedHint',
  REJECTED: 'coach.state.rejectedHint',
};

const searchSchema = z.object({
  tab: z.coerce.string().pipe(z.enum(COACH_TABS)).optional().catch(undefined),
  /** Чужая страница — только администратору (ADR-059, 4.5: «править любую»). */
  id: z.coerce.string().pipe(z.uuid()).optional().catch(undefined),
});

export const Route = createFileRoute('/_app/cabinet/coach')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: CoachCabinetPage,
});

/**
 * Моя страница тренера — ADR-059, `docs/11` 5.4.
 *
 * Сверху статус заявки и «Отправить на проверку» — главное действие экрана,
 * ниже вкладки. Права проверяет сервер (ТС 8.3); экран лишь не предлагает
 * того, что сервер всё равно отвергнет.
 */
function CoachCabinetPage(): ReactNode {
  const t = useT();
  const user = useSessionStore((state) => state.user);
  const { id } = Route.useSearch();
  const coachId = user?.isAdmin === true && id !== undefined ? id : user?.coach?.id;

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <BackLink href="/cabinet" label={t('page.cabinet.title')} />
      <Typography variant="h1" sx={{ mt: 1 }}>
        {t('page.coach.title')}
      </Typography>

      {coachId === undefined ? <NoCoach /> : <CoachEditor coachId={coachId} />}
    </Container>
  );
}

/** Страницы ещё нет: игрок с профилем заводит её отсюда же. */
function NoCoach(): ReactNode {
  const t = useT();
  const user = useSessionStore((state) => state.user);
  const become = useBecomeCoach();

  if (user?.playerId == null) {
    return (
      <Box sx={{ mt: 3 }}>
        <EmptyState
          title={t('cabinet.noProfile.title')}
          text={t('coach.become.needProfile')}
          action={<Button href="/settings/profile">{t('cabinet.noProfile.action')}</Button>}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <EmptyState
        title={t('coach.become.title')}
        text={t('coach.become.text')}
        action={
          <Button
            variant="contained"
            disabled={become.isPending}
            onClick={() => {
              become.mutate();
            }}
          >
            {t('coach.become.action')}
          </Button>
        }
      />
      {become.error !== null && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t(errorMessageKey(become.error))}
        </Alert>
      )}
    </Box>
  );
}

function CoachEditor({ coachId }: { readonly coachId: string }): ReactNode {
  const t = useT();
  const coach = useQuery(coachQuery(coachId));

  if (isMissingResource(coach.error)) {
    return (
      <Typography role="alert" color="text.secondary" sx={{ py: 5, textAlign: 'center' }}>
        {t('coach.notFound')}
      </Typography>
    );
  }

  return (
    <QueryState
      isPending={coach.isPending}
      error={coach.error}
      onRetry={() => void coach.refetch()}
      loading={<RowsSkeleton />}
    >
      {/* Ключ по странице: формы вкладок держат своё состояние и после
          смены страницы (администратор) собираются заново. */}
      {coach.data !== undefined && <Editor key={coach.data.id} coach={coach.data} />}
    </QueryState>
  );
}

function Editor({ coach }: { readonly coach: CoachView }): ReactNode {
  const t = useT();
  const id = useId();
  const navigate = Route.useNavigate();
  const tab = Route.useSearch().tab ?? 'page';
  const newRequests = useNewTrialRequests(coachInbox(coach.id));
  const counts: Partial<Record<CoachTab, number>> = {
    trainings: coach.trainingRequests.length,
    requests: newRequests,
    clubs: coach.clubInvites.length,
  };

  return (
    <>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        {coachFullName(coach.player)}
      </Typography>

      <Box sx={{ mt: 3 }}>
        <StatusBar coach={coach} />
      </Box>

      <Tabs
        value={tab}
        onChange={(_, next: CoachTab) => {
          void navigate({
            search: (previous) => ({ ...previous, tab: next === 'page' ? undefined : next }),
            replace: true,
            resetScroll: false,
          });
        }}
        aria-label={t('page.coach.title')}
        variant="scrollable"
        scrollButtons={false}
        sx={{ mt: 4 }}
      >
        {COACH_TABS.map((value) => (
          <Tab
            key={value}
            value={value}
            label={
              // Ждущие ответа тренера — числом на вкладке: приглашения в
              // тренировки клубов и в штаб, новые заявки на пробную.
              (counts[value] ?? 0) > 0
                ? `${t(TAB_LABELS[value])} (${String(counts[value])})`
                : t(TAB_LABELS[value])
            }
            id={`${id}-tab-${value}`}
            aria-controls={`${id}-panel`}
          />
        ))}
      </Tabs>

      <Box
        key={tab}
        className="tab-panel-in"
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${tab}`}
      >
        {tab === 'page' && (
          <>
            <CoachFreshnessPanel coach={coach} />
            <CoachImagesEditor coach={coach} />
            <CoachPageEditor coach={coach} />
          </>
        )}
        {tab === 'trainings' && <CoachTrainingsTab coach={coach} />}
        {tab === 'requests' && <TrialInboxPanel inbox={coachInbox(coach.id)} />}
        {tab === 'qualification' && <CoachQualificationEditor coach={coach} />}
        {tab === 'posts' && <PostsEditor owner={coachOwner(coach.id)} />}
        {tab === 'media' && (
          <MediaEditor owner={coachOwner(coach.id)} limits={coachLimits('FREE')} />
        )}
        {tab === 'clubs' && <CoachClubsTab coach={coach} />}
        {tab === 'students' && <CoachStudentsTab coach={coach} />}
        {tab === 'stats' && <CoachStatsPanel coach={coach} />}
      </Box>
    </>
  );
}

/**
 * Статус и «Отправить на проверку». Кнопка неактивна, пока не хватает
 * города или тренировки, — и рядом сказано, чего именно (`coachMissing`,
 * одно правило с сервером). Опубликованную правят без повторной проверки:
 * постмодерация.
 */
function StatusBar({ coach }: { readonly coach: CoachView }): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const missing = coachMissing(coach);
  const submittable = canSubmitCoach(coach.status);
  const submit = useMutation({
    mutationFn: () => submitCoach(coach.id),
    onSuccess: async () => {
      // Статус в сессии — для карточки на рабочем столе.
      await Promise.all([queryClient.invalidateQueries({ queryKey: coachKeys.all }), reloadUser()]);
    },
  });

  const hint = coach.hidden ? 'coach.state.hiddenHint' : STATUS_HINTS[coach.status];

  return (
    <>
      <CoachStatusPlate coach={coach} hint={t(hint)}>
        <Button
          variant="text"
          href={`/coaches/${coach.slug}`}
          endIcon={<ExternalLink size={16} aria-hidden />}
          sx={{ minHeight: 44 }}
        >
          {t(isCoachPublic(coach) ? 'coach.open' : 'coach.preview')}
        </Button>
        {submittable && (
          <Button
            variant="contained"
            startIcon={<Send size={16} aria-hidden />}
            disabled={missing.length > 0 || submit.isPending}
            onClick={() => {
              submit.mutate();
            }}
            sx={{ minHeight: 44 }}
          >
            {t('coach.submit')}
          </Button>
        )}
      </CoachStatusPlate>
      {submittable && missing.length > 0 && (
        <Typography
          variant="body2"
          color="text.secondary"
          data-coach-missing
          sx={{ mt: 1 }}
          aria-live="polite"
        >
          {fill(t('coach.missing.lead'), {
            items: missing.map((item) => t(COACH_REQUIREMENT_KEYS[item])).join(', '),
          })}
        </Typography>
      )}
      {submit.error !== null && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t(errorMessageKey(submit.error))}
        </Alert>
      )}
    </>
  );
}
