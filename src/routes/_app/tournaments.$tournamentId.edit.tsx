import type { CreateTournamentInput, TournamentView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { isMissingResource } from '@/common/api';
import { useT } from '@/common/i18n';
import { BackLink } from '@/common/ui/page-header';
import EmptyState from '@/common/ui/empty-state';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { useSessionStore } from '@/features/auth/session-store';
import { isClubStaff } from '@/features/clubs/roles';
import { updateTournament } from '@/features/tournaments/api';
import { tournamentKeys, tournamentQuery } from '@/features/tournaments/queries';
import TournamentForm from '@/features/tournaments/tournament-form';
import { tournamentPatch } from '@/features/tournaments/tournament-patch';

export const Route = createFileRoute('/_app/tournaments/$tournamentId/edit')({
  component: EditTournamentPage,
});

/**
 * Правка турнира — ТС 7.5, ADR-044.
 *
 * Та же форма, что при создании, открытая на сохранённом турнире. Правится
 * до старта: после него схема уже разложена в сетку, а условия отработали
 * при записи участников.
 */
function EditTournamentPage(): ReactNode {
  const t = useT();
  const { tournamentId } = Route.useParams();
  const tournament = useQuery(tournamentQuery(tournamentId));

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <BackLink
        href={`/tournaments/${tournamentId}`}
        label={tournament.data?.name ?? t('nav.tournaments')}
      />
      <Typography variant="h1" sx={{ mt: 1 }}>
        {t('page.editTournament.title')}
      </Typography>

      {isMissingResource(tournament.error) ? (
        <Typography role="alert" color="text.secondary" sx={{ py: 5, textAlign: 'center' }}>
          {t('tournament.notFound')}
        </Typography>
      ) : (
        <QueryState
          isPending={tournament.isPending}
          error={tournament.error}
          onRetry={() => void tournament.refetch()}
          loading={<RowsSkeleton />}
        >
          {tournament.data !== undefined && <Editor tournament={tournament.data} />}
        </QueryState>
      )}
    </Container>
  );
}

function Editor({ tournament }: { readonly tournament: TournamentView }): ReactNode {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useSessionStore((state) => state.user);

  const back = (): Promise<void> =>
    navigate({ to: '/tournaments/$tournamentId', params: { tournamentId: tournament.id } });

  const save = useMutation({
    mutationFn: (values: CreateTournamentInput) => {
      const patch = tournamentPatch(tournament, values);
      return patch === null ? Promise.resolve(tournament) : updateTournament(tournament.id, patch);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
      await back();
    },
  });

  if (!isClubStaff(user, tournament.clubId)) {
    return <EmptyState title={t('editTournament.forbidden')} />;
  }

  if (tournament.startedAt !== null || tournament.status === 'CANCELLED') {
    return <EmptyState title={t('editTournament.locked')} />;
  }

  return (
    <>
      {/* Жеребьёвка разложена по прежней схеме: её смена или смена посева
          сбрасывают расстановку, и об этом лучше узнать до сохранения. */}
      {tournament.status === 'REG_CLOSED' && (
        <Alert severity="info" sx={{ mt: 3 }}>
          {t('editTournament.drawReset')}
        </Alert>
      )}
      <TournamentForm
        clubIds={[tournament.clubId]}
        tournament={tournament}
        isPending={save.isPending}
        error={save.error}
        onSubmit={(values) => {
          save.mutate(values);
        }}
      />
    </>
  );
}
