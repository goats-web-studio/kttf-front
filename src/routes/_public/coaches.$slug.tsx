import { coachImageVariant, isCoachPublic, type CoachView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Pencil } from 'lucide-react';
import { useCallback, useEffect, type ReactNode } from 'react';
import { z } from 'zod';

import { isMissingResource } from '@/common/api';
import { fill, useT } from '@/common/i18n';
import AdSlot from '@/common/ui/ad-slot';
import { BackLink } from '@/common/ui/page-header';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { useSessionStore } from '@/features/auth/session-store';
import { STALE_PUBLIC_DAYS, daysSince, freshnessWhen } from '@/features/clubs/club-time';
import CoachHeader from '@/features/coaches/coach-header';
import {
  AboutBlock,
  AchievementsBlock,
  FactRow,
  GameStatsBlock,
  QualificationBlock,
  TrainingsBlock,
  WhereBlock,
} from '@/features/coaches/coach-sections';
import { coachBySlugQuery } from '@/features/coaches/queries';
import CoachStatusPlate from '@/features/coaches/status-plate';
import StudentsBlock from '@/features/coaches/staff/students-block';
import { trackCoachView } from '@/features/coaches/track';
import TrainingDialogHost from '@/features/coaches/training-dialog-host';
import { searchTraining } from '@/features/coaches/trainings-search';
import Gallery from '@/features/content/gallery';
import { coachOwner } from '@/features/content/owner';
import Posts from '@/features/content/posts';
import SubjectThread from '@/features/forum/subject-thread';

const SECTION_GAP = { xs: 4, md: 6 };

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
  // Новости и акции — сразу за тренировками, фото и видео — после учеников
  // (T2.2, `docs/11` 3.2.2 и 5.3). Пустые не выводятся.
  const owner = coachOwner(coach.id);

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
      <CoachHeader coach={coach} />

      {/* Порядок — решение владельца (`docs/11` 5.3): тренировки, квалификация
          и заслуги сверху, игровая статистика внизу. Стиль — как у профиля
          игрока (ADR-060): квалификация, заслуги и «где тренирует» — рядом
          карточками, боковой колонки больше нет — контакты в плашке «Запись».
          На телефоне тот же порядок одной колонкой (07, 1.2). */}
      <Box data-coach-layout={desktop ? 'desktop' : 'phone'}>
        {services}
        <Posts owner={owner} mt={SECTION_GAP} />
        <FactRow>
          {[
            <QualificationBlock key="qualification" coach={coach} />,
            <AchievementsBlock key="achievements" coach={coach} />,
            <WhereBlock key="where" coach={coach} />,
          ]}
        </FactRow>
        <StudentsBlock coach={coach} />
        <Gallery owner={owner} layout={desktop ? 'grid' : 'strip'} mt={SECTION_GAP} />
        <AboutBlock coach={coach} />
        <GameStatsBlock coach={coach} />
        {/* Отзывы — тема форума о тренере (ADR-064, F2); у черновика их нет. */}
        {isPublic && <SubjectThread type="COACH" id={coach.id} mt={SECTION_GAP} />}
        <Box sx={{ mt: SECTION_GAP, display: 'grid', gap: 2 }}>
          <AdSlot placement="coach-aside" />
          <CoachFreshness reviewedAt={coach.profileReviewedAt} />
        </Box>
      </Box>
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
