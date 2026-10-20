import { coachImageVariant, isCoachPublic, type CoachView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { MapPin, Pencil, Users } from 'lucide-react';
import { useCallback, useEffect, type ReactNode } from 'react';
import { z } from 'zod';

import { isMissingResource } from '@/common/api';
import { fill, formatCount, useLocale, useT } from '@/common/i18n';
import AdSlot from '@/common/ui/ad-slot';
import { BackLink } from '@/common/ui/page-header';
import PlayerAvatar from '@/common/ui/player-avatar';
import QueryState from '@/common/ui/query-state';
import RatingValue from '@/common/ui/rating-value';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { useSessionStore } from '@/features/auth/session-store';
import TrainingDialogHost from '@/features/coaches/training-dialog-host';
import { searchTraining } from '@/features/coaches/trainings-search';
import { STALE_PUBLIC_DAYS, daysSince, freshnessWhen } from '@/features/clubs/club-time';
import { Badge } from '@/features/coaches/coach-cards';
import {
  AboutBlock,
  AchievementsBlock,
  AsideCard,
  EquipmentCard,
  GameStatsBlock,
  QualificationBlock,
  TrainingsBlock,
  WhereContent,
} from '@/features/coaches/coach-sections';
import CoachContactActions, { CoachContactList } from '@/features/coaches/contact-actions';
import { coachFullName, coachPhoto, hasWhere, headerBadges } from '@/features/coaches/labels';
import { coachBySlugQuery } from '@/features/coaches/queries';
import CoachStatusPlate from '@/features/coaches/status-plate';
import { trackCoachView } from '@/features/coaches/track';
import { usePlaceName } from '@/features/places/place-name';

/** `?training=<id>` — окно тренировки поверх страницы (ADR-059). */
const searchSchema = z.object({ training: searchTraining });

export const Route = createFileRoute('/_public/coaches/$slug')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: CoachPage,
});

/**
 * Страница тренера — ADR-059, `docs/11` 5.3.
 *
 * Открыта без входа: её дают в рекламе и пересылают в чатах. Порядок блоков —
 * решение владельца: тренировки, квалификация и заслуги сверху, игровая
 * статистика внизу. Неопубликованную видят только владелец и администратор —
 * сервер отдаёт её им по токену, остальным — «не найдено».
 */
function CoachPage(): ReactNode {
  const t = useT();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  // Окно тренировки — в адресе: «Назад» закрывает его, ссылку можно переслать.
  const openTraining = useCallback(
    (trainingId: string) => {
      void navigate({
        search: (previous) => ({ ...previous, training: trainingId }),
        resetScroll: false,
      });
    },
    [navigate],
  );
  const closeTraining = useCallback(() => {
    void navigate({
      search: (previous) => ({ ...previous, training: undefined }),
      replace: true,
      resetScroll: false,
    });
  }, [navigate]);
  const { slug } = Route.useParams();
  const coach = useQuery(coachBySlugQuery(slug));

  return (
    <TrainingDialogHost trainingId={search.training} onOpen={openTraining} onClose={closeTraining}>
      <Container maxWidth="lg" component="section" sx={{ py: { xs: 4, sm: 6 } }}>
        <BackLink href="/trainings?view=coaches" label={t('nav.trainings')} />

        <Box sx={{ mt: 1 }}>
          {isMissingResource(coach.error) ? (
            <Typography role="alert" color="text.secondary" sx={{ py: 5, textAlign: 'center' }}>
              {t('coach.notFound')}
            </Typography>
          ) : (
            <QueryState
              isPending={coach.isPending}
              error={coach.error}
              onRetry={() => void coach.refetch()}
              loading={<RowsSkeleton />}
            >
              {coach.data !== undefined && <CoachDetails coach={coach.data} />}
            </QueryState>
          )}
        </Box>
      </Container>
    </TrainingDialogHost>
  );
}

function CoachDetails({ coach }: { readonly coach: CoachView }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const user = useSessionStore((state) => state.user);
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const isPublic = isCoachPublic(coach);
  const isOwner = user?.coach?.id === coach.id;
  const canEdit = isOwner || user?.isAdmin === true;
  // Свою страницу правят в кабинете; чужую администратор — там же, по адресу.
  const editHref = isOwner ? '/cabinet/coach' : `/cabinet/coach?id=${coach.id}`;

  useEffect(() => {
    // Просмотр своего черновика — не обращение: считаются только опубликованные.
    if (isPublic && !isOwner) trackCoachView(coach.id);
  }, [coach.id, isPublic, isOwner]);

  const services = <TrainingsBlock coach={coach} />;
  const qualification = <QualificationBlock coach={coach} />;
  const achievements = <AchievementsBlock coach={coach} />;
  const about = <AboutBlock coach={coach} />;
  const game = <GameStatsBlock coach={coach} />;

  const where = hasWhere(coach) ? (
    <AsideCard title={t('coach.where.title')}>
      <WhereContent coach={coach} />
    </AsideCard>
  ) : null;
  const contacts = (
    <AsideCard title={t('club.contacts.title')}>
      <CoachContactList coach={coach} />
    </AsideCard>
  );
  const students =
    coach.studentsCount === 0 ? null : (
      <AsideCard
        title={fill(t('coach.students.title'), {
          count: formatCount(coach.studentsCount, locale),
        })}
      >
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}
        >
          <Users size={16} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
          {t('coach.students.text')}
        </Typography>
      </AsideCard>
    );
  const equipment = <EquipmentCard playerId={coach.player.id} />;
  const fresh = <CoachFreshness reviewedAt={coach.profileReviewedAt} />;

  return (
    <>
      {canEdit && (!isPublic || isOwner) && (
        <Box sx={{ mb: 2 }}>
          <CoachStatusPlate coach={coach}>
            <Button href={editHref} startIcon={<Pencil size={16} aria-hidden />}>
              {t('coach.edit')}
            </Button>
          </CoachStatusPlate>
        </Box>
      )}

      <Cover coach={coach} />
      <Header coach={coach} />

      {desktop ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 8fr) minmax(0, 4fr)', gap: 4 }}>
          <Box>
            {services}
            {qualification}
            {achievements}
            {about}
            {game}
          </Box>
          <Box component="aside" sx={{ mt: 6, display: 'grid', gap: 2, alignContent: 'start' }}>
            {where}
            {contacts}
            {students}
            {equipment}
            <AdSlot placement="coach-aside" />
            {fresh}
          </Box>
        </Box>
      ) : (
        // Телефон — своя раскладка в одну колонку (07, 1.2; `docs/11` 5.3):
        // за тренировками — квалификация и заслуги, где тренирует и ученики,
        // о себе, игровая статистика внизу.
        <Box data-coach-layout="phone">
          {services}
          {qualification}
          {achievements}
          {(where !== null || students !== null) && (
            <Box sx={{ mt: 4, display: 'grid', gap: 2 }}>
              {where}
              {students}
            </Box>
          )}
          {about}
          {game}
          <Box sx={{ mt: 4, display: 'grid', gap: 2 }}>
            {contacts}
            {equipment}
            <AdSlot placement="coach-aside" />
            {fresh}
          </Box>
        </Box>
      )}
    </>
  );
}

/** Обложка — на всю ширину, высота задана пропорцией: страница не прыгает. */
function Cover({ coach }: { readonly coach: CoachView }): ReactNode {
  if (coach.coverUrl === null) return null;

  const url = coach.coverUrl;

  return (
    <Box
      component="img"
      src={coachImageVariant(url, 960)}
      srcSet={`${coachImageVariant(url, 480)} 480w, ${coachImageVariant(url, 960)} 960w, ${coachImageVariant(url, 1600)} 1600w`}
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

/**
 * Шапка: фото, ФИО, город, «тренирует с 2015 года», короткая строка,
 * метки квалификации и кнопки связи (`docs/11` 5.3).
 */
function Header({ coach }: { readonly coach: CoachView }): ReactNode {
  const t = useT();
  const placeName = usePlaceName();
  const badges = headerBadges(coach, t);
  const meta = [
    ...(coach.city === null ? [] : [placeName(coach.city)]),
    ...(coach.coachingSince === null
      ? []
      : [fill(t('coach.since'), { year: String(coach.coachingSince) })]),
  ];

  return (
    <Paper
      variant="outlined"
      component="header"
      sx={{ p: { xs: 2.5, sm: 4 }, mt: coach.coverUrl === null ? 0 : -1 }}
    >
      <Stack direction="row" spacing={{ xs: 2, sm: 3 }} sx={{ alignItems: 'center' }}>
        <PlayerAvatar
          lastName={coach.player.lastName}
          firstName={coach.player.firstName}
          photoUrl={coachPhoto(coach)}
          size="hero"
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="h1"
            sx={{ fontSize: { xs: 26, sm: 34 }, lineHeight: { xs: '30px', sm: '40px' } }}
          >
            {coachFullName(coach.player)}
          </Typography>
          {meta.length > 0 && (
            <Typography
              color="text.secondary"
              sx={{ mt: 0.5, display: 'flex', alignItems: 'flex-start', gap: 0.75 }}
            >
              <MapPin size={16} aria-hidden style={{ flexShrink: 0, marginTop: 4 }} />
              {meta.join(' · ')}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t('ratings.column.rating')}{' '}
            <RatingValue value={coach.player.rating} sx={{ fontWeight: 600 }} />
          </Typography>
        </Box>
      </Stack>

      {coach.headline !== null && (
        <Typography variant="body1" sx={{ mt: 2, fontWeight: 500, maxWidth: 680 }}>
          {coach.headline}
        </Typography>
      )}

      {badges.length > 0 && (
        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {badges.map((badge) => (
            <Badge key={badge}>{badge}</Badge>
          ))}
        </Box>
      )}

      <Box sx={{ mt: 3 }}>
        <CoachContactActions coach={coach} />
      </Box>
    </Paper>
  );
}

/** «Обновлено N дней назад» — как у клуба (ADR-055). Старше 90 дней — честное предупреждение. */
function CoachFreshness({ reviewedAt }: { readonly reviewedAt: string | null }): ReactNode {
  const t = useT();
  const days = daysSince(reviewedAt);

  if (days === null) return null;

  return (
    <Typography variant="body2" color="text.secondary">
      {fill(t('club.fresh.updated'), { when: freshnessWhen(t, days) })}
      {days > STALE_PUBLIC_DAYS && (
        <Typography
          component="span"
          variant="body2"
          sx={{ display: 'block', color: 'var(--warn-text)' }}
        >
          {t('coach.fresh.stale')}
        </Typography>
      )}
    </Typography>
  );
}
