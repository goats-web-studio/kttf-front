import type { CoachListItemView, TrainingListItemView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import CardActionArea from '@mui/material/CardActionArea';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { CalendarClock, MapPin, Users } from 'lucide-react';
import type { ReactNode } from 'react';

import { fill, formatCount, formatMoney, useLocale, useT } from '@/common/i18n';
import PlayerAvatar from '@/common/ui/player-avatar';
import RatingValue from '@/common/ui/rating-value';
import { usePlaceName } from '@/features/places/place-name';

import {
  TRAINING_AUDIENCE_KEYS,
  TRAINING_KIND_KEYS,
  TRAINING_PLACE_KEYS,
  coachPhoto,
  coachShortName,
  isForChildren,
  kidsFromText,
  mainQualification,
  priceText,
} from './labels';

/** Метка-пилюля: квалификация, «дети с 6 лет», аудитория. Не ссылка и не кнопка. */
export function Badge({
  tone = 'ink',
  children,
}: {
  readonly tone?: 'ink' | 'ok';
  readonly children: ReactNode;
}): ReactNode {
  return (
    <Box
      component="span"
      sx={{
        px: 1.25,
        minHeight: 24,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        borderRadius: 999,
        fontSize: 12,
        lineHeight: '16px',
        fontWeight: 600,
        bgcolor: tone === 'ok' ? 'var(--ok-50)' : 'var(--ink-100)',
        color: tone === 'ok' ? 'var(--ok-text)' : 'var(--ink-700)',
      }}
    >
      {children}
    </Box>
  );
}

/** Строка факта с иконкой: где, когда. */
function Fact({
  icon: Icon,
  children,
}: {
  readonly icon: typeof MapPin;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, minWidth: 0 }}
    >
      <Icon size={16} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
      <Box component="span" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
        {children}
      </Box>
    </Typography>
  );
}

/**
 * Карточка тренировки — `docs/11` 5.2: вид и название, тренер с фото и
 * рейтингом, где, расписание, цена или «по договорённости», «дети с 6 лет».
 * Вся карточка — ссылка на страницу тренера: тренировка живёт там.
 */
export function TrainingCard({ training }: { readonly training: TrainingListItemView }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const placeName = usePlaceName();
  const titleId = `training-${training.id}`;
  const { coach } = training;
  const where = [
    t(TRAINING_PLACE_KEYS[training.place]),
    ...(coach.city === null ? [] : [placeName(coach.city)]),
  ].join(' · ');

  return (
    <Paper variant="outlined" component="article" sx={{ height: '100%', overflow: 'hidden' }}>
      <CardActionArea
        href={`/coaches/${coach.slug}`}
        aria-labelledby={titleId}
        sx={{
          height: '100%',
          p: { xs: 2, sm: 2.5 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
          {t(TRAINING_KIND_KEYS[training.kind])}
        </Typography>
        <Typography id={titleId} variant="h3" component="h2" sx={{ mt: 0.5 }}>
          {training.title}
        </Typography>

        <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <PlayerAvatar
            lastName={coach.player.lastName}
            firstName={coach.player.firstName}
            photoUrl={coachPhoto(coach)}
            size="md"
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600 }} noWrap>
              {coachShortName(coach.player)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <RatingValue value={coach.player.rating} />
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mt: 1.5, display: 'grid', gap: 0.5 }}>
          <Fact icon={MapPin}>{where}</Fact>
          {training.schedule !== null && <Fact icon={CalendarClock}>{training.schedule}</Fact>}
        </Box>

        <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {training.kidsFromAge !== null && isForChildren(training.audiences) && (
            <Badge>{kidsFromText(training.kidsFromAge, t)}</Badge>
          )}
          {training.audiences.map((audience) => (
            <Badge key={audience}>{t(TRAINING_AUDIENCE_KEYS[audience])}</Badge>
          ))}
        </Box>

        <Typography
          sx={{ mt: 'auto', pt: 2, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
          color={training.priceKzt === null ? 'text.secondary' : 'text.primary'}
        >
          {priceText(training, t, locale)}
        </Typography>
      </CardActionArea>
    </Paper>
  );
}

/**
 * Тренер в списке — `docs/11` 5.2: фото, имя, рейтинг, город, главная
 * метка квалификации, «от 8 000 ₸», учеников. Клубы штаба — T2.
 */
export function CoachCard({ coach }: { readonly coach: CoachListItemView }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const placeName = usePlaceName();
  const titleId = `coach-${coach.id}`;
  const qualification = mainQualification(coach, t);

  return (
    <Paper variant="outlined" component="article" sx={{ height: '100%', overflow: 'hidden' }}>
      <CardActionArea
        href={`/coaches/${coach.slug}`}
        aria-labelledby={titleId}
        sx={{
          height: '100%',
          p: { xs: 2, sm: 2.5 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
          <PlayerAvatar
            lastName={coach.player.lastName}
            firstName={coach.player.firstName}
            photoUrl={coachPhoto(coach)}
            size="lg"
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography id={titleId} variant="h3" component="h2">
              {coachShortName(coach.player)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <RatingValue value={coach.player.rating} />
              {coach.city !== null && ` · ${placeName(coach.city)}`}
            </Typography>
          </Box>
        </Box>

        {coach.headline !== null && (
          <Typography variant="body2" sx={{ mt: 1.5 }}>
            {coach.headline}
          </Typography>
        )}

        {qualification !== null && (
          <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            <Badge>{qualification}</Badge>
          </Box>
        )}

        <Box
          sx={{
            mt: 'auto',
            pt: 2,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 1,
          }}
        >
          <Typography sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {coach.minPriceKzt === null
              ? t('coach.price.negotiable')
              : fill(t('coach.price.from'), { price: formatMoney(coach.minPriceKzt, locale) })}
          </Typography>
          {coach.studentsCount > 0 && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
            >
              <Users size={14} aria-hidden />
              {fill(t('coach.students'), { count: formatCount(coach.studentsCount, locale) })}
            </Typography>
          )}
        </Box>
      </CardActionArea>
    </Paper>
  );
}
