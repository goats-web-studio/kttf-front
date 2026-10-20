import type { CoachListItemView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import CardActionArea from '@mui/material/CardActionArea';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { Building2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { fill, formatCount, formatMoney, useLocale, useT } from '@/common/i18n';
import PlayerAvatar from '@/common/ui/player-avatar';
import RatingValue from '@/common/ui/rating-value';
import { usePlaceName } from '@/features/places/place-name';

import { coachPhoto, coachShortName, mainQualification } from './labels';

const BADGE_TONES = {
  ink: { bg: 'var(--ink-100)', text: 'var(--ink-700)' },
  ok: { bg: 'var(--ok-50)', text: 'var(--ok-text)' },
  warn: { bg: 'var(--warn-50)', text: 'var(--warn-text)' },
} as const;

/** Метка-пилюля: квалификация, «дети с 6 лет», аудитория. Не ссылка и не кнопка. */
export function Badge({
  tone = 'ink',
  children,
}: {
  readonly tone?: 'ink' | 'ok' | 'warn';
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
        bgcolor: BADGE_TONES[tone].bg,
        color: BADGE_TONES[tone].text,
      }}
    >
      {children}
    </Box>
  );
}

/**
 * Тренер в списке — `docs/11` 5.2: фото, имя, рейтинг, город, клубы,
 * главная метка квалификации, «от 8 000 ₸», тренировок и учеников.
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

        {coach.clubs.length > 0 && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1, display: 'flex', alignItems: 'flex-start', gap: 0.75 }}
          >
            <Building2 size={14} aria-hidden style={{ flexShrink: 0, marginTop: 3 }} />
            {coach.clubs.map((club) => club.name).join(', ')}
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
          <Typography variant="body2" color="text.secondary">
            {fill(t('coach.trainingsCount'), {
              count: formatCount(coach.trainingsCount, locale),
            })}
            {coach.studentsCount > 0 &&
              ` · ${fill(t('coach.students'), { count: formatCount(coach.studentsCount, locale) })}`}
          </Typography>
        </Box>
      </CardActionArea>
    </Paper>
  );
}
