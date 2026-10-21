import type { ClubListItemView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import CardActionArea from '@mui/material/CardActionArea';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { fill, formatDate, useLocale, useT } from '@/common/i18n';
import { usePlaceName } from '@/features/places/place-name';

import Amenities from './amenities';
import ClubMark from './club-mark';
import { daysSince, freshnessWhen } from './club-time';
import OpenStatus from './open-status';

/** Сколько удобств видно в карточке: шестая иконка уже не читается рядом с названием. */
const CARD_AMENITIES = 5;

/**
 * Клуб в списке — docs/07 5.2 `ClubCard`, `docs/09` 5.1.
 *
 * Логотип, название и метки: открыт ли сейчас, ближайший турнир, детская
 * секция. Ниже — город с адресом, столы, удобства иконками и свежесть
 * страницы. Вся карточка — одна ссылка: на телефоне попадать пальцем в
 * название не нужно.
 */
export default function ClubCard({ club }: { readonly club: ClubListItemView }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const placeName = usePlaceName();
  const titleId = `club-${club.id}`;
  const days = daysSince(club.profileReviewedAt);

  return (
    <CardActionArea
      href={`/clubs/${club.id}`}
      aria-labelledby={titleId}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2,
        py: 2,
        px: { sm: 1.5 },
      }}
    >
      <ClubMark club={club} size={56} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            columnGap: 1.5,
            rowGap: 0.75,
          }}
        >
          <Typography id={titleId} variant="h3" component="h2">
            {club.name}
          </Typography>
          <OpenStatus hours={club.hours} short />
          {club.nextTournamentAt !== null && (
            <Tag tone="red">
              {fill(t('clubs.card.next'), { date: formatDate(club.nextTournamentAt, locale) })}
            </Tag>
          )}
          {club.amenities.includes('KIDS') && <Tag>{t('club.amenity.KIDS')}</Tag>}
          {/* Опубликованная тренировка для детей или подростков (ADR-059, T2.1). */}
          {club.kidsTrainings && <Tag>{t('clubs.card.kidsTrainings')}</Tag>}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {club.address === null
            ? placeName(club.city)
            : `${placeName(club.city)} · ${club.address}`}
          {' · '}
          <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {fill(t('club.tables'), { count: String(club.tableCount) })}
          </Box>
          {club.coachesCount > 0 && (
            <>
              {' · '}
              <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {fill(t('clubs.card.coaches'), { count: String(club.coachesCount) })}
              </Box>
            </>
          )}
        </Typography>
        <Box
          sx={{
            mt: 1,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Amenities
            amenities={club.amenities
              .filter((amenity) => amenity !== 'KIDS')
              .slice(0, CARD_AMENITIES)}
            compact
          />
          {days !== null && (
            <Typography variant="caption" color="text.secondary">
              {fill(t('club.fresh.updated'), { when: freshnessWhen(t, days) })}
            </Typography>
          )}
        </Box>
      </Box>
    </CardActionArea>
  );
}

/** Метка карточки. Красная — только ближайший турнир: это и есть действие. */
function Tag({
  tone = 'ink',
  children,
}: {
  readonly tone?: 'ink' | 'red';
  readonly children: ReactNode;
}): ReactNode {
  return (
    <Box
      component="span"
      sx={{
        px: 1.25,
        height: 24,
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        bgcolor: tone === 'red' ? 'var(--red-50)' : 'var(--ink-100)',
        color: tone === 'red' ? 'var(--red-700)' : 'var(--ink-700)',
      }}
    >
      {children}
    </Box>
  );
}
