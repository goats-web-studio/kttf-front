import { MAX_PAGE_SIZE, type TournamentStatus } from '@kttf/shared/types';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import EmptyState from '@/common/ui/empty-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import Surface from '@/common/ui/surface';
import { useSessionStore } from '@/features/auth/session-store';
import { clubDirectoryQuery } from '@/features/clubs/queries';
import TournamentList from '@/features/clubs/tournament-list';
import { tournamentsQuery } from '@/features/tournaments/queries';

export const Route = createFileRoute('/_app/cabinet/tournaments')({
  component: MyTournamentsPage,
});

/** Турнир впереди или идёт: туда игрок записан или подал заявку. */
const AHEAD: ReadonlySet<TournamentStatus> = new Set<TournamentStatus>([
  'PUBLISHED',
  'REG_OPEN',
  'REG_CLOSED',
  'RUNNING',
]);

/** Сыгранных в разделе — последние: вся история в профиле. */
const PAST = 10;

/**
 * «Мои турниры» — ADR-075: куда записан и где заявка ждёт решения, от
 * ближайшего; ниже — сыгранные. Результаты по турнирам — в профиле.
 */
function MyTournamentsPage(): ReactNode {
  const t = useT();
  const playerId = useSessionStore((state) => state.user?.playerId ?? null);
  const directory = useQuery(clubDirectoryQuery);
  const mine = useQuery({
    ...tournamentsQuery({ page: 1, limit: MAX_PAGE_SIZE, playerId: playerId ?? '' }),
    enabled: playerId !== null,
  });
  const all = mine.data?.items ?? [];
  const ahead = all
    .filter((tournament) => AHEAD.has(tournament.status))
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
  const past = all.filter((tournament) => !AHEAD.has(tournament.status)).slice(0, PAST);
  const clubOf = (tournament: { readonly clubId: string }) =>
    directory.data?.get(tournament.clubId);

  return (
    <Container maxWidth="lg" component="section">
      <Typography variant="h1">{t('cabinet.nav.tournaments')}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
        {t('cabinet.tournaments.lead')}
      </Typography>

      {mine.isPending && playerId !== null ? (
        <RowsSkeleton rows={3} />
      ) : (
        <Stack spacing={3}>
          <Surface
            title={t('cabinet.tournaments.ahead')}
            action={<Button href="/tournaments">{t('cabinet.my.find')}</Button>}
          >
            {ahead.length === 0 ? (
              <EmptyState title={t('cabinet.my.empty')} />
            ) : (
              <TournamentList tournaments={ahead} club={undefined} clubOf={clubOf} />
            )}
          </Surface>
          {past.length > 0 && playerId !== null && (
            <Surface
              title={t('cabinet.tournaments.past')}
              action={
                <Button href={`/players/${playerId}`}>{t('cabinet.tournaments.results')}</Button>
              }
            >
              <TournamentList tournaments={past} club={undefined} clubOf={clubOf} />
            </Surface>
          )}
        </Stack>
      )}
    </Container>
  );
}
