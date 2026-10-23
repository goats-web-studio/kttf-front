import { ACHIEVEMENT_ROLES, type CoachView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, Flag, MapPin, TrendingUp, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import { Count } from '@/common/ui/motion';
import QueryState from '@/common/ui/query-state';
import RatingValue from '@/common/ui/rating-value';
import { RowsSkeleton } from '@/common/ui/skeleton';
import StatTile from '@/common/ui/stat-tile';
import { usePlaceName } from '@/features/places/place-name';
import BestWins from '@/features/players/best-wins';
import EquipmentList from '@/features/players/equipment-list';
import { hasEquipment } from '@/features/players/equipment-value';
import { playerQuery, playerSummaryQuery } from '@/features/players/queries';

import { Badge } from './coach-cards';
import { TRAININGS_ANCHOR } from './coach-header';
import { CoachContactList, CoachQuickRequests } from './contact-actions';
import CredentialScan from './credential-scan';
import { splitByOwner } from './enroll';
import { TrainingList } from './training-list';
import {
  ACHIEVEMENT_ROLE_KEYS,
  hasWhere,
  COACH_CATEGORY_KEYS,
  CREDENTIAL_KIND_KEYS,
  SPORTS_RANK_KEYS,
  TRAINING_PLACE_KEYS,
} from './labels';

/**
 * Блоки страницы тренера — `docs/11` 5.3. Пустой блок не выводится вовсе
 * (ADR-042): у тренера без заслуг нет раздела «Заслуги». Раскладку —
 * десктоп 8 + 4 или одна колонка телефона — собирает страница.
 */

/** Раздел основной колонки с заголовком. */
export function Section({
  title,
  action,
  children,
}: {
  readonly title: string;
  readonly action?: ReactNode;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <Box component="section" sx={{ mt: { xs: 4, md: 6 } }}>
      <Box
        sx={{
          mb: 2,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Typography variant="h2">{title}</Typography>
        {action}
      </Box>
      {children}
    </Box>
  );
}

/** Карточка боковой колонки. */
export function AsideCard({
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

/**
 * Карточка ряда «кто он» под тренировками (ADR-060): квалификация, заслуги,
 * где тренирует — тремя колонками на десктопе, столбиком на телефоне.
 * Заголовок — второго уровня: это разделы страницы, а не боковые заметки.
 */
export function FactCard({
  title,
  data,
  children,
}: {
  readonly title: string;
  readonly data: string;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <Paper
      variant="outlined"
      component="section"
      data-fact={data}
      sx={{ p: { xs: 2.5, sm: 3 }, height: { md: '100%' }, minWidth: 0 }}
    >
      <Typography variant="h3" component="h2" sx={{ mb: 2 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

/**
 * Ряд карточек «кто он»: делят ширину поровну. Пустая карточка возвращает
 * `null` уже при отрисовке, поэтому колонки не считаются заранее: `auto-fit`
 * схлопывает пустые дорожки, и одна карточка встаёт во всю ширину.
 */
export function FactRow({ children }: { readonly children: ReactNode }): ReactNode {
  return (
    <Box
      data-coach-facts
      sx={{
        mt: { xs: 4, md: 6 },
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          md: 'repeat(auto-fit, minmax(280px, 1fr))',
        },
        alignItems: 'start',
        '&:empty': { display: 'none' },
      }}
    >
      {children}
    </Box>
  );
}

// ---------------------------------------------------------------- тренировки

/**
 * Тренировки — первым блоком (решение владельца, `docs/11` 2), двумя
 * частями по владельцу (решение от 20.10.2026): «Мои тренировки» — свои,
 * записываются к тренеру; «Веду в клубах» — группы клубов, где он тренер,
 * записываются к клубу. Ниже своих — готовые запросы в WhatsApp.
 */
export function TrainingsBlock({ coach }: { readonly coach: CoachView }): ReactNode {
  const t = useT();
  const parts = splitByOwner(coach.trainings);

  return (
    <Box id={TRAININGS_ANCHOR} sx={{ scrollMarginTop: 80 }}>
      {parts.coach.length > 0 && (
        <Section title={t('training.part.own')}>
          <Box data-coach-trainings="own">
            <TrainingList trainings={parts.coach} context="coach" showPlace />
          </Box>
          <Box sx={{ mt: 2 }}>
            <CoachQuickRequests coach={coach} />
          </Box>
        </Section>
      )}
      {parts.club.length > 0 && (
        <Section title={t('training.part.inClubs')}>
          <Box data-coach-trainings="clubs">
            <TrainingList trainings={parts.club} context="coach" showPlace />
          </Box>
        </Section>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------- квалификация

/** Строка «подпись — значение»; пустое не выводится. */
function Row({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string | null;
}): ReactNode {
  if (value === null) return null;

  return (
    <Box sx={{ display: 'contents' }}>
      <Typography component="dt" variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
        {label}
      </Typography>
      <Typography component="dd" sx={{ m: 0, fontWeight: 500, overflowWrap: 'anywhere' }}>
        {value}
      </Typography>
    </Box>
  );
}

/**
 * «Квалификация и документы» — разряд, категории, образование и документы.
 * «Проверено KTTF» ставит администратор по скану; без метки — заявление
 * тренера (`docs/11` 6). Скан открывается, только если тренер так решил.
 */
export function QualificationBlock({ coach }: { readonly coach: CoachView }): ReactNode {
  const t = useT();
  const hasFacts =
    coach.sportsRank !== null ||
    (coach.coachCategory !== null && coach.coachCategory !== 'NONE') ||
    coach.refereeCategory !== null ||
    coach.education !== null;

  if (!hasFacts && coach.credentials.length === 0) return null;

  return (
    <FactCard title={t('coach.qualification.title')} data="qualification">
      <Box>
        {hasFacts && (
          <Box
            component="dl"
            sx={{
              m: 0,
              display: 'grid',
              gridTemplateColumns: '1fr',
              rowGap: 0.25,
              '& dt:not(:first-of-type)': { mt: 1.25 },
            }}
          >
            <Row
              label={t('coach.field.sportsRank')}
              value={coach.sportsRank === null ? null : t(SPORTS_RANK_KEYS[coach.sportsRank])}
            />
            <Row
              label={t('coach.field.coachCategory')}
              value={
                coach.coachCategory === null ? null : t(COACH_CATEGORY_KEYS[coach.coachCategory])
              }
            />
            <Row label={t('coach.field.refereeCategory')} value={coach.refereeCategory} />
            <Row label={t('coach.field.education')} value={coach.education} />
          </Box>
        )}

        {coach.credentials.length > 0 && (
          <Box
            component="ul"
            sx={{
              m: 0,
              mt: hasFacts ? 2.5 : 0,
              p: 0,
              listStyle: 'none',
              borderTop: hasFacts ? 1 : 0,
              borderColor: 'divider',
            }}
          >
            {coach.credentials.map((credential) => (
              <Box
                component="li"
                key={credential.id}
                sx={{
                  py: 1.5,
                  display: 'grid',
                  gap: 0.5,
                  borderBottom: 1,
                  borderColor: 'divider',
                  '&:last-of-type': { borderBottom: 0, pb: 0 },
                }}
              >
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontWeight: 600 }}>{credential.title}</Typography>
                  {credential.verifiedAt !== null && (
                    <Badge tone="ok">
                      <BadgeCheck size={14} aria-hidden />
                      {t('coach.credential.verified')}
                    </Badge>
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {[
                    t(CREDENTIAL_KIND_KEYS[credential.kind]),
                    credential.issuer,
                    credential.year === null ? null : String(credential.year),
                  ]
                    .filter((part) => part !== null)
                    .join(' · ')}
                </Typography>
                {credential.fileUrl !== null && (
                  <Box>
                    <CredentialScan
                      url={credential.fileUrl}
                      isPublic={credential.filePublic}
                      version={credential.file}
                    />
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </FactCard>
  );
}

// ---------------------------------------------------------------- заслуги

/** «Заслуги» — игроком и тренером, «год — достижение». */
export function AchievementsBlock({ coach }: { readonly coach: CoachView }): ReactNode {
  const t = useT();

  if (coach.achievements.length === 0) return null;

  const groups = ACHIEVEMENT_ROLES.map((role) => ({
    role,
    items: coach.achievements.filter((achievement) => achievement.role === role),
  })).filter((group) => group.items.length > 0);

  return (
    <FactCard title={t('coach.achievements.title')} data="achievements">
      <Box sx={{ display: 'grid', gap: 2.5 }}>
        {groups.map((group) => (
          <Box key={group.role}>
            <Typography
              variant="caption"
              component="h3"
              color="text.secondary"
              sx={{ mb: 1, fontWeight: 600 }}
            >
              {t(ACHIEVEMENT_ROLE_KEYS[group.role])}
            </Typography>
            <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 0.75 }}>
              {group.items.map((achievement) => (
                <Box
                  component="li"
                  key={achievement.id}
                  sx={{ display: 'grid', gridTemplateColumns: '48px minmax(0, 1fr)', gap: 1.5 }}
                >
                  <Typography
                    sx={{
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 700,
                      color: 'var(--red-600)',
                    }}
                  >
                    {achievement.year ?? ''}
                  </Typography>
                  <Typography sx={{ overflowWrap: 'anywhere', fontWeight: 500 }}>
                    {achievement.title}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </FactCard>
  );
}

/** «О себе» — простой текст, переносы строк как написаны. */
export function AboutBlock({ coach }: { readonly coach: CoachView }): ReactNode {
  const t = useT();

  if (coach.about === null) return null;

  return (
    <Section title={t('coach.about.title')}>
      <Typography sx={{ whiteSpace: 'pre-line', maxWidth: 680, overflowWrap: 'anywhere' }}>
        {coach.about}
      </Typography>
    </Section>
  );
}

// ---------------------------------------------------------------- боковые блоки

/** «Где тренирует»: форматы, районы выезда, город. Клубы штаба — T2. */
export function WhereContent({ coach }: { readonly coach: CoachView }): ReactNode {
  const t = useT();
  const placeName = usePlaceName();

  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      {coach.city !== null && (
        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <MapPin size={16} aria-hidden style={{ color: 'var(--ink-500)' }} />
          {placeName(coach.city)}
        </Typography>
      )}
      {coach.formats.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {coach.formats.map((format) => (
            <Badge key={format}>{t(TRAINING_PLACE_KEYS[format])}</Badge>
          ))}
        </Box>
      )}
      {coach.visitAreas !== null && (
        <Typography variant="body2" color="text.secondary">
          {`${t('coach.field.visitAreas')}: ${coach.visitAreas}`}
        </Typography>
      )}
      {coach.clubs.length > 0 && (
        // Тренерский штаб (T2.1): клубы, где он работает, с должностью.
        <Box data-coach-clubs>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            {t('staff.public.worksIn')}
          </Typography>
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 0.5 }}>
            {coach.clubs.map((entry) => (
              <Typography component="li" variant="body2" key={entry.club.id}>
                <Link href={`/clubs/${entry.club.id}`} sx={{ fontWeight: 600 }}>
                  {entry.club.name}
                </Link>
                {entry.position === null ? '' : ` · ${entry.position}`}
              </Typography>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

/** «Где тренирует» и контакты списком — третья карточка ряда «кто он». */
export function WhereBlock({ coach }: { readonly coach: CoachView }): ReactNode {
  const t = useT();

  return (
    <FactCard title={t('coach.where.title')} data="where">
      <Box sx={{ display: 'grid', gap: 2.5 }}>
        {hasWhere(coach) && <WhereContent coach={coach} />}
        <Box>
          <Typography
            variant="caption"
            component="h3"
            color="text.secondary"
            sx={{ mb: 1, fontWeight: 600 }}
          >
            {t('club.contacts.title')}
          </Typography>
          <CoachContactList coach={coach} />
        </Box>
      </Box>
    </FactCard>
  );
}

/** «Чем играет» — инвентарь из профиля игрока, ссылками в маркет (ADR-058). */
export function EquipmentCard({ playerId }: { readonly playerId: string }): ReactNode {
  const t = useT();
  const player = useQuery(playerQuery(playerId));

  if (player.data === undefined || !hasEquipment(player.data)) return null;

  return (
    <AsideCard title={t('coach.equipment.title')}>
      <EquipmentList player={player.data} />
    </AsideCard>
  );
}

/**
 * «Игровая статистика» — внизу страницы (решение владельца): рейтинг,
 * максимальный, турниров, лучшие победы. Из запросов профиля игрока
 * (ADR-048), со ссылкой на профиль.
 */
export function GameStatsBlock({ coach }: { readonly coach: CoachView }): ReactNode {
  const t = useT();
  const summary = useQuery(playerSummaryQuery(coach.player.id, 'ALL'));

  return (
    <Section
      title={t('coach.game.title')}
      action={
        <Link href={`/players/${coach.player.id}`} variant="body2">
          {t('coach.game.profile')}
        </Link>
      }
    >
      <QueryState
        isPending={summary.isPending}
        error={summary.error}
        onRetry={() => void summary.refetch()}
        loading={<RowsSkeleton rows={1} />}
      >
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))',
          }}
        >
          <StatTile
            icon={Trophy}
            label={t('ratings.column.rating')}
            value={<RatingValue value={coach.player.rating} />}
          />
          {summary.data !== undefined && (
            <>
              <StatTile
                icon={TrendingUp}
                label={t('profile.maxRating')}
                value={<RatingValue value={summary.data.maxRating} />}
              />
              <StatTile
                icon={Flag}
                label={t('profile.stats.tournaments')}
                value={<Count value={summary.data.tournaments} />}
              />
            </>
          )}
        </Box>
      </QueryState>
      <Box
        sx={{
          mt: 2,
          display: 'grid',
          gap: 2,
          // Инвентарь — колонкой справа, если он есть; без него победы во всю ширину.
          gridTemplateColumns: 'minmax(0, 1fr)',
          gridAutoFlow: { md: 'column' },
          gridAutoColumns: { md: '360px' },
          alignItems: 'start',
        }}
      >
        <BestWins playerId={coach.player.id} />
        <EquipmentCard playerId={coach.player.id} />
      </Box>
    </Section>
  );
}
