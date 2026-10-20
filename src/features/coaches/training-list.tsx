import type { TrainingCoachRef, TrainingGroupView, TrainingView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { CalendarClock, MapPin, MessageCircle, Phone, Send, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { fill, useLocale, useT } from '@/common/i18n';
import PlayerAvatar from '@/common/ui/player-avatar';
import RatingValue from '@/common/ui/rating-value';
import ClubMark from '@/features/clubs/club-mark';
import { usePlaceName } from '@/features/places/place-name';

import { Badge } from './coach-cards';
import { enrollAction, linkStateKey, splitByOwner, trackEnroll } from './enroll';
import {
  TRAINING_AUDIENCE_KEYS,
  TRAINING_KIND_KEYS,
  coachPhoto,
  coachShortName,
  isForChildren,
  kidsFromText,
  placeText,
  priceText,
} from './labels';

/**
 * Тренировки строками — в блоках `/trainings`, на странице тренера и на
 * странице клуба (ADR-059). Решение владельца от 20.10.2026: всегда видно,
 * кто владелец и кому писать. Группа клуба — владелец клуб, тренер в ней
 * подписан «Тренер: X». Своя тренировка тренера — владелец тренер, клуб в
 * ней только место.
 */

/** Ссылки и кнопки строки — над растянутой ссылкой «Подробнее». */
const ABOVE = { position: 'relative', zIndex: 1 } as const;

const CHANNEL_ICONS: Readonly<Record<'WHATSAPP' | 'PHONE' | 'TELEGRAM', LucideIcon>> = {
  WHATSAPP: MessageCircle,
  PHONE: Phone,
  TELEGRAM: Send,
};

/** Тренер-владелец: фото, имя ссылкой на страницу, рейтинг. */
export function CoachChip({ coach }: { readonly coach: TrainingCoachRef }): ReactNode {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
      <PlayerAvatar
        lastName={coach.player.lastName}
        firstName={coach.player.firstName}
        photoUrl={coachPhoto(coach)}
        size="md"
      />
      <Box sx={{ minWidth: 0 }}>
        <Link
          href={`/coaches/${coach.slug}`}
          color="inherit"
          sx={{ ...ABOVE, display: 'block', fontWeight: 600, overflowWrap: 'anywhere' }}
        >
          {coachShortName(coach.player)}
        </Link>
        <Typography variant="body2" color="text.secondary">
          <RatingValue value={coach.player.rating} />
        </Typography>
      </Box>
    </Box>
  );
}

/**
 * «Записаться» — владельцу, с готовым текстом про эту тренировку, и
 * «Подробнее». Обводкой и текстом: главная кнопка на экране одна (07,
 * запрет 2), а строк в списке много.
 */
export function TrainingActions({
  training,
  details = true,
}: {
  readonly training: TrainingView;
  readonly details?: boolean;
}): ReactNode {
  const t = useT();
  const action = enrollAction(training, t);
  const Icon = action === null ? null : CHANNEL_ICONS[action.kind];

  return (
    <Box
      sx={{
        ...ABOVE,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1,
        justifyContent: { md: 'flex-end' },
      }}
    >
      {action !== null && Icon !== null && (
        <Button
          size="small"
          href={action.href}
          startIcon={<Icon size={16} aria-hidden />}
          {...(action.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          onClick={() => {
            trackEnroll(action);
          }}
          sx={{ minHeight: 44 }}
        >
          {t('training.enroll')}
        </Button>
      )}
      {details && (
        <Button
          size="small"
          variant="text"
          href={`/trainings/${training.id}`}
          sx={{ minHeight: 44 }}
        >
          {t('training.details')}
        </Button>
      )}
    </Box>
  );
}

/**
 * Где показана строка — от этого зависят владелец и место:
 * - `club` — блок клуба и страница клуба: у группы клуба «Тренер: X», у
 *   тренировки тренера — тренер-владелец карточкой;
 * - `place` — зал вне KTTF и «выезд и онлайн»: владелец — тренер карточкой;
 * - `coach` — страница тренера: своя тренировка — с местом, клубная —
 *   «Группа клуба X».
 */
export type TrainingContext = 'club' | 'place' | 'coach';

interface TrainingRowProps {
  readonly training: TrainingView;
  readonly context: TrainingContext;
  /** Показать место — где его не сказала шапка блока. */
  readonly showPlace: boolean;
  /** Без «Записаться» и «Подробнее» — в кабинете, где у строки свои кнопки. */
  readonly actions?: boolean;
}

export function TrainingRow({
  training,
  context,
  showPlace,
  actions = true,
}: TrainingRowProps): ReactNode {
  const t = useT();
  const locale = useLocale();
  const fromClub = training.author === 'CLUB';
  // Тренер-владелец — карточкой, кроме его собственной страницы.
  const ownerCoach = !fromClub && context !== 'coach' ? training.coach : null;
  // Связь ждёт ответа или отклонена — такую строку видят только стороны и
  // администратор, и она не должна выглядеть опубликованной.
  const linkState = linkStateKey(training);

  return (
    <Box
      component="li"
      data-training={training.id}
      data-training-owner={training.author}
      sx={{
        position: 'relative',
        px: { xs: 2, sm: 3 },
        py: 2,
        display: 'grid',
        columnGap: 3,
        rowGap: 1.25,
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          md: ownerCoach === null ? 'minmax(0, 1fr) 260px' : 'minmax(0, 1fr) 220px 260px',
        },
        alignItems: 'start',
        borderTop: 1,
        borderColor: 'divider',
        '&:first-of-type': { borderTop: 0 },
        ...(actions
          ? { '@media (hover: hover)': { '&:hover': { bgcolor: 'var(--paper-hover)' } } }
          : {}),
      }}
    >
      <Box sx={{ minWidth: 0, display: 'grid', gap: 0.75 }}>
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            {t(TRAINING_KIND_KEYS[training.kind])}
          </Typography>
          <Typography variant="h3" component="h3" sx={{ mt: 0.25 }}>
            {actions ? (
              // Вся строка ведёт на страницу тренировки: ссылка заголовка
              // растянута на строку, кнопки и ссылки лежат над ней.
              <Link
                href={`/trainings/${training.id}`}
                color="inherit"
                underline="hover"
                sx={{ '&::after': { content: '""', position: 'absolute', inset: 0 } }}
              >
                {training.title}
              </Link>
            ) : (
              training.title
            )}
          </Typography>
        </Box>
        {fromClub && context === 'coach' && training.club !== null && (
          <Typography variant="body2" sx={{ fontWeight: 500 }} data-training-enroll="club">
            {t('training.via.clubNamed')}{' '}
            <Link href={`/clubs/${training.club.id}`} sx={ABOVE}>
              {training.club.name}
            </Link>
          </Typography>
        )}
        {fromClub && context !== 'coach' && (
          // Группа клуба: пишут клубу, тренер на него работает (решение
          // владельца от 21.10.2026).
          <Typography variant="body2" data-training-enroll="club">
            {t('training.via.club')}
            {training.coach !== null && (
              <>
                {` · ${t('training.via.groupCoach')} `}
                <Link href={`/coaches/${training.coach.slug}`} sx={{ ...ABOVE, fontWeight: 600 }}>
                  {coachShortName(training.coach.player)}
                </Link>
              </>
            )}
          </Typography>
        )}
        {!fromClub && context === 'club' && (
          // Своя тренировка тренера в зале клуба: пишут тренеру или, если
          // он так выбрал, клубу (решение владельца от 21.10.2026).
          <Typography
            variant="body2"
            color="text.secondary"
            data-training-enroll={training.booking === 'CLUB' ? 'club' : 'coach'}
          >
            {t(training.booking === 'CLUB' ? 'training.via.club' : 'training.via.coach')}
          </Typography>
        )}
        <Typography
          variant="body2"
          color="text.secondary"
          component="div"
          sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 2, rowGap: 0.5 }}
        >
          {showPlace && (
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              <MapPin size={14} aria-hidden style={{ flexShrink: 0 }} />
              {training.club === null || fromClub ? (
                placeText(training, t)
              ) : (
                <Link href={`/clubs/${training.club.id}`} color="inherit" sx={ABOVE}>
                  {placeText(training, t)}
                </Link>
              )}
            </Box>
          )}
          {training.schedule !== null && (
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              <CalendarClock size={14} aria-hidden style={{ flexShrink: 0 }} />
              {training.schedule}
            </Box>
          )}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {training.kidsFromAge !== null && isForChildren(training.audiences) && (
            <Badge>{kidsFromText(training.kidsFromAge, t)}</Badge>
          )}
          {training.audiences.map((audience) => (
            <Badge key={audience}>{t(TRAINING_AUDIENCE_KEYS[audience])}</Badge>
          ))}
          {linkState !== null && (
            <Badge tone="warn">
              <span data-training-link={training.link}>{t(linkState)}</span>
            </Badge>
          )}
        </Box>
        {training.note !== null && (
          <Typography variant="body2" color="text.secondary">
            {training.note}
          </Typography>
        )}
      </Box>
      {ownerCoach !== null && <CoachChip coach={ownerCoach} />}
      <Box
        sx={{
          display: 'grid',
          gap: 1,
          justifyItems: { xs: 'start', md: 'end' },
          textAlign: { md: 'right' },
        }}
      >
        <Typography
          sx={{
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            color: training.priceKzt === null ? 'text.secondary' : 'text.primary',
          }}
        >
          {priceText(training, t, locale)}
        </Typography>
        {actions && <TrainingActions training={training} />}
      </Box>
    </Box>
  );
}

/** Список строк в одной карточке. */
export function TrainingList({
  trainings,
  ...row
}: {
  readonly trainings: readonly TrainingView[];
} & Omit<TrainingRowProps, 'training'>): ReactNode {
  return (
    <Paper variant="outlined" component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
      {trainings.map((training) => (
        <TrainingRow key={training.id} training={training} {...row} />
      ))}
    </Paper>
  );
}

/** Подзаголовок части блока: «Группы клуба», «Тренеры в клубе». */
function PartTitle({ children }: { readonly children: ReactNode }): ReactNode {
  return (
    <Typography
      variant="body2"
      component="h3"
      sx={{
        px: { xs: 2, sm: 3 },
        pt: 1.5,
        pb: 0.5,
        fontWeight: 600,
        color: 'text.secondary',
      }}
    >
      {children}
    </Typography>
  );
}

/**
 * Тренировки клуба двумя частями: группы клуба (записываются к клубу) и
 * личные тренировки тренеров в его зале (записываются к тренеру).
 */
export function ClubTrainingParts({
  trainings,
}: {
  readonly trainings: readonly TrainingView[];
}): ReactNode {
  const t = useT();
  const parts = splitByOwner(trainings);

  return (
    <>
      {parts.club.length > 0 && (
        <Box data-training-part="CLUB">
          <PartTitle>{t('training.part.clubGroups')}</PartTitle>
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
            {parts.club.map((training) => (
              <TrainingRow key={training.id} training={training} context="club" showPlace={false} />
            ))}
          </Box>
        </Box>
      )}
      {parts.coach.length > 0 && (
        <Box
          data-training-part="COACH"
          sx={{ borderTop: parts.club.length > 0 ? 1 : 0, borderColor: 'divider' }}
        >
          <PartTitle>{t('training.part.coaches')}</PartTitle>
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
            {parts.coach.map((training) => (
              <TrainingRow key={training.id} training={training} context="club" showPlace={false} />
            ))}
          </Box>
        </Box>
      )}
    </>
  );
}

/**
 * Блок `/trainings` — место и его тренировки (`docs/11` 3.1.1): клуб KTTF
 * с логотипом, названием-ссылкой и адресом — двумя частями по владельцу;
 * зал вне KTTF с пометкой; последним — «Выезд и онлайн».
 */
export function TrainingGroupBlock({ group }: { readonly group: TrainingGroupView }): ReactNode {
  const t = useT();
  const placeName = usePlaceName();
  const club = group.kind === 'CLUB' ? group.club : null;
  const venue = group.kind === 'VENUE' ? group.venue : null;

  return (
    <Paper
      variant="outlined"
      component="section"
      data-training-group={group.kind}
      sx={{ overflow: 'hidden' }}
    >
      <Box
        component="header"
        sx={{
          px: { xs: 2, sm: 3 },
          py: { xs: 1.5, sm: 2 },
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1.5, sm: 2 },
          bgcolor: 'var(--paper-sunken)',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        {club !== null && (
          <>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <ClubMark club={club} size={48} />
            </Box>
            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
              <ClubMark club={club} size={36} />
            </Box>
          </>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h3" component="h2">
            {club !== null ? (
              <Link href={`/clubs/${club.id}`} color="inherit">
                {club.name}
              </Link>
            ) : venue !== null ? (
              venue.name
            ) : (
              t('training.group.anywhere')
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
            {club !== null
              ? club.address === null
                ? placeName(club.city)
                : `${placeName(club.city)} · ${club.address}`
              : venue !== null
                ? fill(t('training.group.venue'), { address: venue.address })
                : t('training.group.anywhereHint')}
          </Typography>
        </Box>
      </Box>
      {club !== null ? (
        <ClubTrainingParts trainings={group.trainings} />
      ) : (
        <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
          {group.trainings.map((training) => (
            <TrainingRow
              key={training.id}
              training={training}
              context="place"
              showPlace={group.kind === 'ANYWHERE'}
            />
          ))}
        </Box>
      )}
    </Paper>
  );
}
