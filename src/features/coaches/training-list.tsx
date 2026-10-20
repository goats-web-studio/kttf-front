import type { TrainingCoachRef, TrainingGroupView, TrainingView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { CalendarClock, MapPin } from 'lucide-react';
import type { ReactNode } from 'react';

import { fill, useLocale, useT, type MessageKey } from '@/common/i18n';
import PlayerAvatar from '@/common/ui/player-avatar';
import RatingValue from '@/common/ui/rating-value';
import ClubMark from '@/features/clubs/club-mark';
import { usePlaceName } from '@/features/places/place-name';

import { Badge } from './coach-cards';
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
 * странице клуба (ADR-059, решение владельца от 20.10.2026). Что в строке,
 * зависит от места: в блоке клуба место уже сказано шапкой, на странице
 * тренера тренер — он сам.
 */

/** Тренер строки: фото, имя ссылкой на страницу, рейтинг. */
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
          sx={{ display: 'block', fontWeight: 600, overflowWrap: 'anywhere' }}
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

interface TrainingRowProps {
  readonly training: TrainingView;
  /** Показать тренера (в блоках и у клуба), а не на странице самого тренера. */
  readonly showCoach: boolean;
  /** Показать место — где его не сказала шапка блока. */
  readonly showPlace: boolean;
  /** На странице тренера: клубная тренировка помечена «тренировка клуба X». */
  readonly showAuthor?: boolean;
  /**
   * Подписи связи, ждущей ответа или отклонённой, — глазами автора. Такие
   * строки видит только автор: публично их нет.
   */
  readonly linkKeys?: Readonly<Record<'PENDING' | 'CONFIRMED' | 'DECLINED', MessageKey>>;
}

export function TrainingRow({
  training,
  showCoach,
  showPlace,
  showAuthor = false,
  linkKeys,
}: TrainingRowProps): ReactNode {
  const t = useT();
  const locale = useLocale();
  const coach = showCoach ? training.coach : null;
  const pending =
    linkKeys !== undefined && (training.link === 'PENDING' || training.link === 'DECLINED');

  return (
    <Box
      component="li"
      data-training={training.id}
      sx={{
        px: { xs: 2, sm: 3 },
        py: 2,
        display: 'grid',
        columnGap: 3,
        rowGap: 1.25,
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          // Колонки одной ширины во всех строках блока: тренеры и цены
          // встают столбиком, даже если у строки тренера нет.
          md: showCoach ? 'minmax(0, 1fr) 240px 168px' : 'minmax(0, 1fr) 168px',
        },
        alignItems: 'start',
        borderTop: 1,
        borderColor: 'divider',
        '&:first-of-type': { borderTop: 0 },
      }}
    >
      <Box sx={{ minWidth: 0, display: 'grid', gap: 0.75 }}>
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            {t(TRAINING_KIND_KEYS[training.kind])}
          </Typography>
          <Typography variant="h3" component="h3" sx={{ mt: 0.25 }}>
            {training.title}
          </Typography>
        </Box>
        {showAuthor && training.author === 'CLUB' && training.club !== null && (
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {t('training.ofClub')}{' '}
            <Link href={`/clubs/${training.club.id}`}>{training.club.name}</Link>
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
              {training.club === null || (showAuthor && training.author === 'CLUB') ? (
                placeText(training, t)
              ) : (
                <Link href={`/clubs/${training.club.id}`} color="inherit">
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
          {pending && (
            <Badge tone="warn">{t(linkKeys[training.link as 'PENDING' | 'DECLINED'])}</Badge>
          )}
        </Box>
        {training.note !== null && (
          <Typography variant="body2" color="text.secondary">
            {training.note}
          </Typography>
        )}
      </Box>
      {coach !== null && <CoachChip coach={coach} />}
      {showCoach && coach === null && <Box sx={{ display: { xs: 'none', md: 'block' } }} />}
      <Typography
        sx={{
          gridRow: { xs: 2, md: 'auto' },
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          textAlign: { md: 'right' },
          color: training.priceKzt === null ? 'text.secondary' : 'text.primary',
        }}
      >
        {priceText(training, t, locale)}
      </Typography>
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

/**
 * Блок `/trainings` — место и его тренировки (`docs/11` 3.1.1): клуб KTTF
 * с логотипом, названием-ссылкой и адресом; зал вне KTTF с пометкой; затем
 * «Выезд и онлайн».
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
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <ClubMark club={club} size={48} />
          </Box>
        )}
        {club !== null && (
          <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
            <ClubMark club={club} size={36} />
          </Box>
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
      <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
        {group.trainings.map((training) => (
          <TrainingRow
            key={training.id}
            training={training}
            showCoach
            showPlace={group.kind === 'ANYWHERE'}
          />
        ))}
      </Box>
    </Paper>
  );
}
