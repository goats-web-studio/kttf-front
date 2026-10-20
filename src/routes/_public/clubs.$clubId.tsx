import { MAX_PAGE_SIZE, clubImageVariant, type ClubView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { MapPin, Settings } from 'lucide-react';
import { useEffect, useMemo, type ReactNode } from 'react';

import { isMissingResource } from '@/common/api';
import { fill, useT } from '@/common/i18n';
import AdSlot from '@/common/ui/ad-slot';
import { BackLink } from '@/common/ui/page-header';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { useSessionStore } from '@/features/auth/session-store';
import ClubGallery from '@/features/club-content/club-gallery';
import ClubPosts from '@/features/club-content/club-posts';
import ClubTrainingsSection from '@/features/coaches/club/club-trainings-section';
import Amenities from '@/features/clubs/amenities';
import { ClubNumbers, ClubResults } from '@/features/clubs/club-live';
import ClubMark from '@/features/clubs/club-mark';
import { groupClubTournaments } from '@/features/clubs/club-tournaments';
import ContactActions, { ContactList, QuickRequests } from '@/features/clubs/contact-actions';
import Freshness from '@/features/clubs/freshness';
import HoursTable from '@/features/clubs/hours-table';
import OpenStatus from '@/features/clubs/open-status';
import PriceList from '@/features/clubs/price-list';
import { clubMembersQuery, clubQuery } from '@/features/clubs/queries';
import MemberName from '@/features/clubs/member-name';
import RoleName from '@/features/clubs/role-name';
import { isClubStaff } from '@/features/clubs/roles';
import TournamentList from '@/features/clubs/tournament-list';
import { trackClubView } from '@/features/clubs/track';
import { usePlaceName } from '@/features/places/place-name';
import LeadersTable from '@/features/players/leaders-table';
import { tournamentsQuery } from '@/features/tournaments/queries';

export const Route = createFileRoute('/_public/clubs/$clubId')({
  component: ClubPage,
});

/** Сколько прошедших турниров и игроков на странице. Остальное — по ссылке. */
const PAST = 5;
const PLAYERS = 10;

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
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <BackLink href="/clubs" label={t('nav.clubs')} />

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
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));

  useEffect(() => {
    trackClubView(club.id);
  }, [club.id]);

  // Разделы страницы. Пустые не выводятся вовсе (ADR-042): у клуба без цен
  // нет раздела «Цены».
  const tournaments = <Tournaments club={club} />;
  const prices =
    club.prices.length === 0 ? null : (
      <Section title={t('club.prices.title')}>
        <PriceList prices={club.prices} />
        <Box sx={{ mt: 2 }}>
          <QuickRequests club={club} requests={['rent']} />
        </Box>
      </Section>
    );
  // Тренировки в клубе — рядом с ценами: и то и другое отвечает «сколько
  // стоит и когда приходить» (ADR-059).
  const trainings = <ClubTrainingsSection club={club} />;
  const posts = <ClubPosts clubId={club.id} />;
  const gallery = <ClubGallery clubId={club.id} />;
  const results = <ClubResults clubId={club.id} />;
  const about =
    club.description === null ? null : (
      <Section title={t('club.field.description')}>
        <Typography sx={{ whiteSpace: 'pre-line', maxWidth: 680 }}>{club.description}</Typography>
      </Section>
    );
  const players = (
    <Box component="section" sx={{ mt: 6 }}>
      <Stack
        direction="row"
        sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 2 }}
      >
        <Typography variant="h2">{t('club.players.title')}</Typography>
        <Link href={`/players?club=${club.id}`} variant="body2">
          {t('club.players.all')}
        </Link>
      </Stack>
      <LeadersTable
        query={{ page: 1, limit: PLAYERS, clubId: club.id }}
        empty={t('club.players.empty')}
      />
    </Box>
  );
  const staff = <Staff clubId={club.id} />;

  const contacts = (
    <AsideCard title={t('club.contacts.title')}>
      <ContactList club={club} />
    </AsideCard>
  );
  const hours =
    club.hours.length === 0 && club.hoursNote === null ? null : (
      <AsideCard title={t('club.hours.title')}>
        <HoursTable hours={club.hours} note={club.hoursNote} />
      </AsideCard>
    );
  const hall = (
    <AsideCard title={t('club.hall.title')}>
      <Hall club={club} />
    </AsideCard>
  );
  const numbers = <ClubNumbers clubId={club.id} />;
  const fresh = <Freshness reviewedAt={club.profileReviewedAt} />;

  return (
    <>
      <Cover club={club} />
      <Paper
        variant="outlined"
        component="header"
        sx={{ p: { xs: 2.5, sm: 4 }, mt: club.coverUrl === null ? 0 : -1 }}
      >
        <Stack
          direction="row"
          useFlexGap
          spacing={2}
          sx={{ alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}
        >
          <Stack direction="row" spacing={2.5} sx={{ alignItems: 'center', minWidth: 0 }}>
            <ClubMark club={club} size={72} />
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h1"
                sx={{ fontSize: { xs: 28, sm: 36 }, lineHeight: { xs: '32px', sm: '40px' } }}
              >
                {club.name}
              </Typography>
              <Typography
                color="text.secondary"
                sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.75 }}
              >
                <MapPin size={16} aria-hidden style={{ flexShrink: 0 }} />
                {club.address === null
                  ? placeName(club.city)
                  : `${placeName(club.city)} · ${club.address}`}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <OpenStatus hours={club.hours} />
              </Box>
            </Box>
          </Stack>
          {isClubStaff(user, club.id) && (
            <Button
              href={`/cabinet/club/${club.id}?tab=page`}
              startIcon={<Settings size={16} aria-hidden />}
            >
              {t('club.manage')}
            </Button>
          )}
        </Stack>

        <Box sx={{ mt: 3 }}>
          <ContactActions club={club} />
        </Box>
      </Paper>

      {desktop ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 8fr) minmax(0, 4fr)', gap: 4 }}>
          <Box>
            {tournaments}
            {prices}
            {trainings}
            {posts}
            {results}
            {gallery}
            {about}
            {players}
            {staff}
          </Box>
          <Box component="aside" sx={{ mt: 6, display: 'grid', gap: 2, alignContent: 'start' }}>
            {contacts}
            {hours}
            {hall}
            {numbers}
            <AdSlot placement="club-aside" />
            {fresh}
          </Box>
        </Box>
      ) : (
        // Телефон — своя раскладка, а не сжатый десктоп (07, 1.2): в зал
        // идут сегодня, поэтому часы и цены выше состава и игроков.
        <Box>
          {tournaments}
          {prices}
          {trainings}
          {posts}
          {hours !== null && <Box sx={{ mt: 4 }}>{hours}</Box>}
          {gallery}
          {results}
          <Box sx={{ mt: 4, display: 'grid', gap: 2 }}>
            {hall}
            {numbers}
          </Box>
          {about}
          <Box sx={{ mt: 4 }}>{contacts}</Box>
          {players}
          {staff}
          <AdSlot placement="club-aside" />
          <Box sx={{ mt: 4 }}>{fresh}</Box>
        </Box>
      )}
    </>
  );
}

/**
 * Обложка — сверху, на всю ширину контента. Высота задана пропорцией, а не
 * ожиданием картинки: страница не прыгает, пока обложка грузится.
 */
function Cover({ club }: { readonly club: ClubView }): ReactNode {
  if (club.coverUrl === null) return null;

  const url = club.coverUrl;

  return (
    <Box
      component="img"
      src={clubImageVariant(url, 960)}
      srcSet={`${clubImageVariant(url, 480)} 480w, ${clubImageVariant(url, 960)} 960w, ${clubImageVariant(url, 1600)} 1600w`}
      sizes="(min-width: 1320px) 1280px, 100vw"
      alt=""
      fetchPriority="high"
      sx={{
        display: 'block',
        width: '100%',
        aspectRatio: { xs: '16 / 9', md: '21 / 6' },
        objectFit: 'cover',
        borderRadius: '16px 16px 0 0',
        bgcolor: 'var(--ink-100)',
      }}
    />
  );
}

/** Раздел основной колонки с заголовком. */
function Section({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <Box component="section" sx={{ mt: 6 }}>
      <Typography variant="h2" sx={{ mb: 2 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

/** Карточка боковой колонки. */
function AsideCard({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <Paper variant="outlined" component="section" sx={{ p: 2.5 }}>
      <Typography variant="h3" sx={{ mb: 1.5 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

/** Зал: столы, модель, пол, потолки, удобства. Незаполненное не показывается. */
function Hall({ club }: { readonly club: ClubView }): ReactNode {
  const t = useT();

  // Модели из каталога заменяют марку строкой (ADR-058): тогда в строке
  // «Столы» — только число, а модели — ссылками ниже.
  const rows: [string, string][] = [
    [
      t('club.hall.tables'),
      club.tableBrand === null || club.tables.length > 0
        ? String(club.tableCount)
        : `${String(club.tableCount)} · ${club.tableBrand}`,
    ],
  ];
  if (club.floorType !== null) rows.push([t('club.hall.floor'), t(`club.floor.${club.floorType}`)]);
  if (club.ceilingHeightCm !== null) {
    rows.push([
      t('club.hall.ceiling'),
      fill(t('club.hall.ceilingValue'), {
        value: (club.ceilingHeightCm / 100).toLocaleString('ru', { maximumFractionDigits: 1 }),
      }),
    ]);
  }

  return (
    <>
      <Box
        component="dl"
        sx={{ m: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 0.75 }}
      >
        {rows.map(([label, value]) => (
          <Box key={label} sx={{ display: 'contents' }}>
            <Typography component="dt" variant="body2" color="text.secondary" sx={{ pr: 2 }}>
              {label}
            </Typography>
            <Typography component="dd" variant="body2" sx={{ m: 0, fontWeight: 500 }}>
              {value}
            </Typography>
          </Box>
        ))}
      </Box>
      {club.tables.length > 0 && (
        <Box
          component="ul"
          sx={{ m: 0, mt: 1.5, p: 0, listStyle: 'none', display: 'grid', gap: 0.5 }}
        >
          {club.tables.map((table) => (
            <Typography component="li" variant="body2" key={table.product.id}>
              <Link href={`/market/items/${table.product.slug}`}>
                {`${table.product.brand.name} ${table.product.name}`}
              </Link>
              <Box
                component="span"
                sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
              >
                {` × ${String(table.count)}`}
              </Box>
            </Typography>
          ))}
        </Box>
      )}
      {club.amenities.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Amenities amenities={club.amenities} />
        </Box>
      )}
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
        <Paper variant="outlined" component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
          {(members.data ?? []).map((member) => (
            <Box
              key={member.userId}
              component="li"
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                px: { xs: 2, sm: 3 },
                py: 1.75,
                borderTop: 1,
                borderColor: 'divider',
                '&:first-of-type': { borderTop: 0 },
              }}
            >
              <Typography sx={{ fontWeight: 500 }}>
                <MemberName member={member} />
              </Typography>
              <Box
                component="span"
                sx={{
                  px: 1.25,
                  height: 24,
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderRadius: 999,
                  bgcolor: 'var(--ink-100)',
                  color: 'var(--ink-700)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <RoleName role={member.role} />
              </Box>
            </Box>
          ))}
        </Paper>
      </QueryState>
    </Box>
  );
}
