import { MAX_PAGE_SIZE, type ClubView, type CreateClubInput } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { ExternalLink } from 'lucide-react';
import { useId, useMemo, useState, type ReactNode } from 'react';
import { z } from 'zod';

import { isMissingResource } from '@/common/api';
import { formatCount, useLocale, useT, type MessageKey } from '@/common/i18n';
import EmptyState from '@/common/ui/empty-state';
import { BackLink } from '@/common/ui/page-header';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { useSessionStore } from '@/features/auth/session-store';
import { updateClub } from '@/features/clubs/api';
import ClubForm from '@/features/clubs/club-form';
import ClubMark from '@/features/clubs/club-mark';
import { clubPatch } from '@/features/clubs/club-patch';
import {
  GROUP_ORDER,
  groupClubTournaments,
  type ClubTournamentGroup,
} from '@/features/clubs/club-tournaments';
import { clubKeys, clubQuery } from '@/features/clubs/queries';
import { isClubStaff } from '@/features/clubs/roles';
import StaffPanel from '@/features/clubs/staff-panel';
import TournamentList from '@/features/clubs/tournament-list';
import { usePlaceName } from '@/features/places/place-name';
import { tournamentsQuery } from '@/features/tournaments/queries';

/**
 * Разделы управления — вкладками. Раньше турниры, форма данных клуба и
 * состав шли одной лентой: организатор, пришедший открыть консоль, листал
 * мимо формы с девятью полями. Вкладка живёт в адресе.
 */
const MANAGE_TABS = ['tournaments', 'settings', 'staff'] as const;

type ManageTab = (typeof MANAGE_TABS)[number];

const MANAGE_TAB_LABELS: Readonly<Record<ManageTab, MessageKey>> = {
  tournaments: 'club.tournaments.title',
  settings: 'manage.settings.title',
  staff: 'club.staff.title',
};

const searchSchema = z.object({ tab: z.enum(MANAGE_TABS).optional().catch(undefined) });

export const Route = createFileRoute('/_app/cabinet/club/$clubId')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: ClubManagementPage,
});

const GROUP_TITLES: Readonly<Record<ClubTournamentGroup, MessageKey>> = {
  running: 'manage.tournaments.running',
  open: 'manage.tournaments.open',
  draft: 'manage.tournaments.draft',
  finished: 'manage.tournaments.finished',
  cancelled: 'manage.tournaments.cancelled',
};

/**
 * Управление клубом — рабочее место организатора.
 *
 * Сверху турниры клуба по стадиям: организатор приходит сюда довести
 * черновик, закрыть запись или открыть консоль. Ниже — данные клуба и
 * состав. Права проверяет сервер (ТС 8.3); экран лишь не предлагает того,
 * что сервер всё равно отвергнет.
 */
function ClubManagementPage(): ReactNode {
  const t = useT();
  const { clubId } = Route.useParams();
  const user = useSessionStore((state) => state.user);
  const club = useQuery(clubQuery(clubId));

  if (!isClubStaff(user, clubId)) {
    return (
      <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
        <Typography variant="h1" sx={{ mb: 3 }}>
          {t('club.manage')}
        </Typography>
        <EmptyState
          title={t('manage.forbidden.title')}
          text={t('manage.forbidden.text')}
          action={<Button href={`/clubs/${clubId}`}>{t('manage.publicPage')}</Button>}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <BackLink href="/cabinet/clubs" label={t('nav.myClubs')} />
      {isMissingResource(club.error) ? (
        <Typography role="alert" color="text.secondary" sx={{ py: 5, textAlign: 'center' }}>
          {t('club.notFound')}
        </Typography>
      ) : (
        <QueryState
          isPending={club.isPending}
          error={club.error}
          onRetry={() => void club.refetch()}
          loading={<RowsSkeleton />}
        >
          {club.data !== undefined && <Management club={club.data} />}
        </QueryState>
      )}
    </Container>
  );
}

function Management({ club }: { readonly club: ClubView }): ReactNode {
  const t = useT();
  const placeName = usePlaceName();
  const id = useId();
  const navigate = Route.useNavigate();
  const tab = Route.useSearch().tab ?? 'tournaments';

  return (
    <>
      <Paper variant="outlined" component="header" sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Stack
          direction="row"
          useFlexGap
          spacing={2}
          sx={{ alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}
        >
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', minWidth: 0 }}>
            <ClubMark club={club} size={56} />
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h1"
                sx={{ fontSize: { xs: 26, sm: 32 }, lineHeight: { xs: '30px', sm: '36px' } }}
              >
                {club.name}
              </Typography>
              <Typography color="text.secondary">{placeName(club.city)}</Typography>
            </Box>
          </Stack>
          <Button href={`/clubs/${club.id}`} endIcon={<ExternalLink size={16} aria-hidden />}>
            {t('manage.publicPage')}
          </Button>
        </Stack>
      </Paper>

      <Tabs
        value={tab}
        onChange={(_, next: ManageTab) => {
          void navigate({
            search: { tab: next === 'tournaments' ? undefined : next },
            replace: true,
            resetScroll: false,
          });
        }}
        aria-label={t('club.manage')}
        variant="scrollable"
        scrollButtons={false}
        sx={{ mt: 4 }}
      >
        {MANAGE_TABS.map((value) => (
          <Tab
            key={value}
            value={value}
            label={t(MANAGE_TAB_LABELS[value])}
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
        // Разделы рассчитаны на ленту и несут свой отступ сверху.
        sx={{ '& > :first-of-type': { mt: 3 } }}
      >
        {tab === 'tournaments' && <ClubTournaments club={club} />}
        {tab === 'settings' && <ClubSettings club={club} />}
        {tab === 'staff' && <StaffPanel clubId={club.id} />}
      </Box>
    </>
  );
}

/**
 * Турниры клуба по стадиям — от идущего к архиву.
 *
 * Черновики видны только составу клуба: сервер отдаёт их тому, кто клубом
 * управляет, и прячет от остальных. Идущий турнир несёт кнопку консоли —
 * ради неё организатор в день турнира сюда и приходит.
 */
function ClubTournaments({ club }: { readonly club: ClubView }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const tournaments = useQuery(
    tournamentsQuery({ page: 1, limit: MAX_PAGE_SIZE, clubId: club.id }),
  );
  const grouped = useMemo(
    () => groupClubTournaments(tournaments.data?.items ?? []),
    [tournaments.data],
  );
  const groups = GROUP_ORDER.filter((group) => grouped[group].length > 0);

  return (
    <Box component="section" sx={{ mt: 5 }}>
      <Stack
        direction="row"
        useFlexGap
        spacing={2}
        sx={{ alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}
      >
        <Typography variant="h2">{t('club.tournaments.title')}</Typography>
        <Button variant="contained" href={`/tournaments/new?club=${club.id}`}>
          {t('tournament.form.create')}
        </Button>
      </Stack>

      <Box sx={{ mt: 2 }}>
        <QueryState
          isPending={tournaments.isPending}
          error={tournaments.error}
          onRetry={() => void tournaments.refetch()}
          loading={<RowsSkeleton rows={3} />}
        >
          {groups.length === 0 ? (
            <EmptyState
              title={t('manage.tournaments.empty.title')}
              text={t('manage.tournaments.empty.text')}
            />
          ) : (
            groups.map((group) => (
              <Box key={group} sx={{ mt: 3 }}>
                <Typography variant="h3" sx={{ mb: 1 }}>
                  {t(GROUP_TITLES[group])}
                  <Typography
                    component="span"
                    color="text.secondary"
                    sx={{ ml: 1, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatCount(grouped[group].length, locale)}
                  </Typography>
                </Typography>
                <Box sx={{ bgcolor: 'background.paper' }}>
                  <TournamentList
                    tournaments={grouped[group]}
                    club={club}
                    action={(tournament) =>
                      tournament.status === 'RUNNING' ? (
                        // Главное действие экрана одно — создание турнира
                        // (ADR-039): консоль рядом, но не спорит с ним.
                        <Button href={`/console/${tournament.id}`} sx={{ mr: { sm: 1.5 } }}>
                          {t('manage.console')}
                        </Button>
                      ) : null
                    }
                  />
                </Box>
              </Box>
            ))
          )}
        </QueryState>
      </Box>
    </Box>
  );
}

/** Данные клуба — правка тем же набором полей, что и при создании. */
function ClubSettings({ club }: { readonly club: ClubView }): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: (values: CreateClubInput) => {
      const patch = clubPatch(club, values);
      return patch === null ? Promise.resolve(club) : updateClub(club.id, patch);
    },
    onSuccess: async () => {
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: clubKeys.all });
    },
  });

  return (
    <Paper variant="outlined" component="section" sx={{ mt: 6, p: { xs: 2.5, sm: 4 } }}>
      <Typography variant="h2">{t('manage.settings.title')}</Typography>
      {saved && !save.isPending && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {t('manage.settings.saved')}
        </Alert>
      )}
      {/* Правка сравнивается со свежим клубом из запроса, а не с тем, что
          был при открытии формы: повторное «Сохранить» не шлёт старое. */}
      <ClubForm
        club={club}
        isPending={save.isPending}
        error={save.error}
        submitLabel={t('manage.settings.save')}
        onSubmit={(values) => {
          setSaved(false);
          save.mutate(values);
        }}
      />
    </Paper>
  );
}
