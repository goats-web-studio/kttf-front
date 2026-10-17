import { MAX_PAGE_SIZE, type ClubView, type CreateClubInput } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState, type ReactNode } from 'react';

import { isMissingResource } from '@/common/api';
import { formatCount, useLocale, useT, type MessageKey } from '@/common/i18n';
import EmptyState from '@/common/ui/empty-state';
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
import { tournamentsQuery } from '@/features/tournaments/queries';

export const Route = createFileRoute('/_app/cabinet/club/$clubId')({
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
      <Container maxWidth="md" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
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
    <Container maxWidth="md" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <Link href="/cabinet/clubs" variant="body2" sx={{ display: 'inline-block', py: 1.5 }}>
        {t('nav.myClubs')}
      </Link>
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

  return (
    <>
      <Stack
        direction="row"
        useFlexGap
        spacing={2}
        sx={{ mt: 1, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', minWidth: 0 }}>
          <ClubMark club={club} size={56} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h1">{club.name}</Typography>
            <Typography color="text.secondary">{club.city}</Typography>
          </Box>
        </Stack>
        <Button href={`/clubs/${club.id}`}>{t('manage.publicPage')}</Button>
      </Stack>

      <ClubTournaments club={club} />
      <ClubSettings club={club} />
      <StaffPanel clubId={club.id} />
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
            <EmptyState title={t('manage.tournaments.empty.title')} text={t('manage.tournaments.empty.text')} />
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
                        <Button
                          href={`/console/${tournament.id}`}
                          sx={{ mr: { sm: 1.5 } }}
                        >
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
    <Box component="section" sx={{ mt: 6 }}>
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
    </Box>
  );
}
