import { MAX_PAGE_SIZE, type ClubView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo, type ReactNode } from 'react';

import { isMissingResource } from '@/common/api';
import { useT } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { useSessionStore } from '@/features/auth/session-store';
import ClubMark from '@/features/clubs/club-mark';
import { groupClubTournaments } from '@/features/clubs/club-tournaments';
import { instagramHandle, instagramHref, phoneHref, whatsappHref } from '@/features/clubs/contacts';
import { clubMembersQuery, clubQuery } from '@/features/clubs/queries';
import MemberName from '@/features/clubs/member-name';
import RoleName from '@/features/clubs/role-name';
import { isClubStaff } from '@/features/clubs/roles';
import TournamentList from '@/features/clubs/tournament-list';
import { usePlaceName } from '@/features/places/place-name';
import LeadersTable from '@/features/players/leaders-table';
import { tournamentsQuery } from '@/features/tournaments/queries';

export const Route = createFileRoute('/_public/clubs/$clubId')({
  component: ClubPage,
});

/** Сколько прошедших турниров и игроков на странице. Остальное — по ссылке. */
const PAST = 5;
const PLAYERS = 10;

const PAIRS = {
  display: 'grid',
  columnGap: 2,
  rowGap: 0.5,
  gridTemplateColumns: { xs: '1fr', sm: 'max-content 1fr' },
  m: 0,
  '& dd': { m: 0 },
} as const;

/**
 * Публичная страница клуба — ТЗ 3.2: расписание турниров, история, участники.
 *
 * Открыта без входа, как и всё в публичной части: ссылку на клуб дают
 * новичку, который ищет, где играть.
 */
function ClubPage(): ReactNode {
  const t = useT();
  const { clubId } = Route.useParams();
  const club = useQuery(clubQuery(clubId));

  return (
    <Container maxWidth="md" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <Link href="/clubs" variant="body2" sx={{ display: 'inline-block', py: 1.5 }}>
        {t('nav.clubs')}
      </Link>

      <Box sx={{ mt: 1 }}>
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
            {club.data !== undefined && <ClubDetails club={club.data} />}
          </QueryState>
        )}
      </Box>
    </Container>
  );
}

function ClubDetails({ club }: { readonly club: ClubView }): ReactNode {
  const t = useT();
  const placeName = usePlaceName();
  const user = useSessionStore((state) => state.user);

  return (
    <>
      <Stack
        direction="row"
        useFlexGap
        spacing={2}
        sx={{ alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', minWidth: 0 }}>
          <ClubMark club={club} size={64} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h1">{club.name}</Typography>
            <Typography color="text.secondary">
              {club.address === null
                ? placeName(club.city)
                : `${placeName(club.city)} · ${club.address}`}
            </Typography>
          </Box>
        </Stack>
        {isClubStaff(user, club.id) && (
          <Button href={`/cabinet/club/${club.id}`}>{t('club.manage')}</Button>
        )}
      </Stack>

      <Facts club={club} />

      {club.description !== null && (
        <Typography sx={{ mt: 3, whiteSpace: 'pre-line', maxWidth: 640 }}>
          {club.description}
        </Typography>
      )}

      <Tournaments club={club} />

      <Box component="section" sx={{ mt: 6 }}>
        <Stack
          direction="row"
          sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 2 }}
        >
          <Typography variant="h2">{t('club.players.title')}</Typography>
          <Link href={`/ratings?club=${club.id}`} variant="body2">
            {t('club.players.all')}
          </Link>
        </Stack>
        <LeadersTable
          query={{ page: 1, limit: PLAYERS, clubId: club.id }}
          empty={t('club.players.empty')}
        />
      </Box>

      <Staff clubId={club.id} />
    </>
  );
}

/** Столы и контакты. Незаполненное не показывается вовсе, а не прочерком. */
function Facts({ club }: { readonly club: ClubView }): ReactNode {
  const t = useT();

  return (
    <Box component="dl" sx={{ ...PAIRS, mt: 3 }}>
      <Fact label={t('club.field.tableCount')}>{club.tableCount}</Fact>
      {club.phone !== null && (
        <Fact label={t('club.field.phone')}>
          <Link href={phoneHref(club.phone)}>{club.phone}</Link>
        </Fact>
      )}
      {club.whatsapp !== null && (
        <Fact label={t('club.field.whatsapp')}>
          <Link href={whatsappHref(club.whatsapp)} target="_blank" rel="noreferrer">
            {club.whatsapp}
          </Link>
        </Fact>
      )}
      {club.instagram !== null && (
        <Fact label={t('club.field.instagram')}>
          <Link href={instagramHref(club.instagram)} target="_blank" rel="noreferrer">
            @{instagramHandle(club.instagram)}
          </Link>
        </Fact>
      )}
    </Box>
  );
}

function Fact({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <>
      <Typography component="dt" variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography component="dd" variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {children}
      </Typography>
    </>
  );
}

/**
 * Расписание и история — ТЗ 3.2.
 *
 * Одним запросом с потолком страницы: у клуба десятки турниров, а не тысячи.
 * Сервер отдаёт их от ранних к поздним, поэтому при сотне с лишним турниров
 * свежие перестанут сюда попадать — тогда история уйдёт в календарь с
 * фильтром клуба, куда и сейчас ведёт ссылка «Все турниры клуба».
 */
function Tournaments({ club }: { readonly club: ClubView }): ReactNode {
  const t = useT();
  const tournaments = useQuery(
    tournamentsQuery({ page: 1, limit: MAX_PAGE_SIZE, clubId: club.id }),
  );
  const grouped = useMemo(
    () => groupClubTournaments(tournaments.data?.items ?? []),
    [tournaments.data],
  );
  const upcoming = [...grouped.running, ...grouped.open];
  const past = grouped.finished.slice(0, PAST);

  return (
    <Box component="section" sx={{ mt: 6 }}>
      <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Typography variant="h2">{t('club.tournaments.title')}</Typography>
        <Link href={`/tournaments?club=${club.id}`} variant="body2">
          {t('club.tournaments.all')}
        </Link>
      </Stack>
      <QueryState
        isPending={tournaments.isPending}
        error={tournaments.error}
        onRetry={() => void tournaments.refetch()}
        loading={<RowsSkeleton rows={2} />}
      >
        <Typography variant="h3" sx={{ mt: 3, mb: 1 }}>
          {t('club.tournaments.upcoming')}
        </Typography>
        {upcoming.length === 0 ? (
          <Typography color="text.secondary">{t('club.tournaments.noUpcoming')}</Typography>
        ) : (
          <TournamentList tournaments={upcoming} club={club} />
        )}
        <Typography variant="h3" sx={{ mt: 4, mb: 1 }}>
          {t('club.tournaments.past')}
        </Typography>
        {past.length === 0 ? (
          <Typography color="text.secondary">{t('club.tournaments.noPast')}</Typography>
        ) : (
          <TournamentList tournaments={past} club={club} />
        )}
      </QueryState>
    </Box>
  );
}

/** Организаторы — ТЗ 3.2, «состав организаторов с ролями». */
function Staff({ clubId }: { readonly clubId: string }): ReactNode {
  const t = useT();
  const members = useQuery(clubMembersQuery(clubId));

  return (
    <Box component="section" sx={{ mt: 6 }}>
      <Typography variant="h2" sx={{ mb: 2 }}>
        {t('club.staff.title')}
      </Typography>
      <QueryState
        isPending={members.isPending}
        error={members.error}
        onRetry={() => void members.refetch()}
        loading={<RowsSkeleton rows={2} />}
      >
        <Stack component="ul" spacing={1} sx={{ m: 0, p: 0, listStyle: 'none' }}>
          {(members.data ?? []).map((member) => (
            <Typography key={member.userId} component="li">
              <MemberName member={member} />
              <Typography component="span" color="text.secondary">
                {' · '}
                <RoleName role={member.role} />
              </Typography>
            </Typography>
          ))}
        </Stack>
      </QueryState>
    </Box>
  );
}
