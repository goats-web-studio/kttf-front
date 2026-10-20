import { ACHIEVEMENT_ROLES, type CoachView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, Flag, MapPin, TrendingUp, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';

import { formatCount, useLocale, useT } from '@/common/i18n';
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
import { CoachQuickRequests } from './contact-actions';
import CredentialScan from './credential-scan';
import { TrainingList } from './training-list';
import {
  ACHIEVEMENT_ROLE_KEYS,
  COACH_CATEGORY_KEYS,
  CREDENTIAL_KIND_KEYS,
  LINK_KEYS_FOR_COACH,
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

// ---------------------------------------------------------------- тренировки

/**
 * «Тренировки и цены» — первым блоком (решение владельца, `docs/11` 2):
 * свои тренировки тренера и клубные, где он подтвердил участие. У строки
 * место — клуб ссылкой, зал с адресом, «выезд» или «онлайн»; клубная
 * помечена «тренировка клуба X». Ниже — готовые запросы в WhatsApp.
 */
export function TrainingsBlock({ coach }: { readonly coach: CoachView }): ReactNode {
  const t = useT();

  if (coach.trainings.length === 0) return null;

  return (
    <Section title={t('coach.services.title')}>
      <TrainingList
        trainings={coach.trainings}
        showCoach={false}
        showPlace
        showAuthor
        linkKeys={LINK_KEYS_FOR_COACH}
      />
      <Box sx={{ mt: 2 }}>
        <CoachQuickRequests coach={coach} />
      </Box>
    </Section>
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
      <Typography component="dt" variant="body2" color="text.secondary">
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
    <Section title={t('coach.qualification.title')}>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        {hasFacts && (
          <Box
            component="dl"
            sx={{
              m: 0,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'max-content minmax(0, 1fr)' },
              columnGap: 3,
              rowGap: { xs: 0.25, sm: 1 },
              '& dt:not(:first-of-type)': { mt: { xs: 1, sm: 0 } },
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
      </Paper>
    </Section>
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
    <Section title={t('coach.achievements.title')}>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, display: 'grid', gap: 2.5 }}>
        {groups.map((group) => (
          <Box key={group.role}>
            <Typography variant="h3" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Trophy size={18} aria-hidden />
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
                    color="text.secondary"
                    sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}
                  >
                    {achievement.year ?? ''}
                  </Typography>
                  <Typography sx={{ overflowWrap: 'anywhere' }}>{achievement.title}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Paper>
    </Section>
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
    </Box>
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
  const locale = useLocale();
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
                value={formatCount(summary.data.tournaments, locale)}
              />
            </>
          )}
        </Box>
      </QueryState>
      <Box sx={{ mt: 2 }}>
        <BestWins playerId={coach.player.id} />
      </Box>
    </Section>
  );
}
