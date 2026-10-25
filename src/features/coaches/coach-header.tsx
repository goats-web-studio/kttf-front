import { nextSession, type CoachView, type TrainingView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { BadgeCheck, CalendarClock, ChevronDown, MapPin, Users } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';

import { fill, formatCount, formatMoney, useLocale, useT } from '@/common/i18n';
import RatingValue from '@/common/ui/rating-value';
import FollowButton from '@/features/follows/follow-button';
import { usePlaceName } from '@/features/places/place-name';
import ProfilePhoto from '@/features/players/profile-photo';

import CoachContactActions from './contact-actions';
import { splitByOwner } from './enroll';
import {
  coachFullName,
  coachPhoto,
  headerBadges,
  PRICE_UNIT_KEYS,
  TRAINING_PLACE_KEYS,
} from './labels';
import { nextSessionText } from './schedule';

/** Якорь блока тренировок — плашка записи ведёт к нему. */
export const TRAININGS_ANCHOR = 'trainings';

/**
 * Шапка страницы тренера — визитка, как у профиля игрока (ADR-060), но
 * акцент другой: у игрока главное — рейтинг, у тренера — запись. Страница
 * тренера — канал продаж (ADR-059), поэтому тёмная плашка справа — «Запись»:
 * цена «от», ближайшее занятие и кнопки связи.
 *
 * Слева человек: фото, имя, «Проверено KTTF» за проверенные документы,
 * город, «тренирует с», рейтинг ссылкой на профиль игрока, короткая строка
 * и метки — разряд, категория, «дети с N лет», языки, форматы.
 */
export default function CoachHeader({ coach }: { readonly coach: CoachView }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const placeName = usePlaceName();
  const badges = [
    ...headerBadges(coach, t),
    ...coach.formats.map((format) => t(TRAINING_PLACE_KEYS[format])),
  ];
  const verified = coach.credentials.some((credential) => credential.verifiedAt !== null);

  return (
    <Paper
      variant="outlined"
      component="header"
      sx={{
        // Под обложкой карточка продолжает её: прямые верхние углы и без
        // верхней рамки, а не нахлёст на 8px — тёмная плашка стоит вровень
        // с краем карточки и при нахлёсте вылезала бы на картинку.
        ...(coach.coverUrl !== null && {
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderTop: 0,
        }),
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) 320px' },
        alignItems: 'stretch',
        overflow: 'hidden',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 2, sm: 3 }}
        sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, minWidth: 0, p: { xs: 2.5, sm: 4 } }}
      >
        <Box sx={{ flexShrink: 0 }}>
          <ProfilePhoto
            lastName={coach.player.lastName}
            firstName={coach.player.firstName}
            photoUrl={coachPhoto(coach)}
          />
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Stack
            direction="row"
            useFlexGap
            spacing={1.5}
            sx={{ alignItems: 'center', flexWrap: 'wrap' }}
          >
            <Typography
              variant="h1"
              sx={{ fontSize: { xs: 28, sm: 36 }, lineHeight: { xs: '32px', sm: '42px' } }}
            >
              {coachFullName(coach.player)}
            </Typography>
            {verified && (
              <Box
                component="span"
                data-coach-verified
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  typography: 'body2',
                  fontWeight: 600,
                  color: 'var(--ok)',
                }}
              >
                <BadgeCheck size={16} aria-hidden />
                {t('coach.header.verified')}
              </Box>
            )}
          </Stack>

          <Stack
            direction="row"
            useFlexGap
            spacing={2}
            sx={{
              mt: 1,
              flexWrap: 'wrap',
              alignItems: 'center',
              color: 'text.secondary',
              typography: 'body2',
            }}
          >
            {coach.city !== null && (
              <Box
                component="span"
                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
              >
                <MapPin size={15} aria-hidden />
                {placeName(coach.city)}
              </Box>
            )}
            {coach.coachingSince !== null && (
              <span>{fill(t('coach.since'), { year: String(coach.coachingSince) })}</span>
            )}
            <Link href={`/players/${coach.player.id}`} color="inherit" data-coach-rating>
              {t('ratings.column.rating')}{' '}
              <RatingValue value={coach.player.rating} sx={{ fontWeight: 600 }} />
            </Link>
            {coach.studentsCount > 0 && (
              <Link
                // Якорь на блок учеников на этой же странице — мимо роутера.
                component="a"
                href="#students"
                color="inherit"
                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
              >
                <Users size={15} aria-hidden />
                {fill(t('coach.header.students'), {
                  count: formatCount(coach.studentsCount, locale),
                })}
              </Link>
            )}
          </Stack>

          {coach.headline !== null && (
            <Typography sx={{ mt: 2, fontWeight: 500, maxWidth: 620 }}>{coach.headline}</Typography>
          )}

          {/* Подписка — новости и акции тренера в ленте (ADR-073). */}
          {coach.status === 'APPROVED' && (
            <Box sx={{ mt: 2 }}>
              <FollowButton type="COACH" id={coach.id} />
            </Box>
          )}

          {badges.length > 0 && (
            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {badges.map((badge) => (
                <Box
                  key={badge}
                  component="span"
                  data-chip
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: 32,
                    px: 1.5,
                    borderRadius: 999,
                    typography: 'body2',
                    fontWeight: 600,
                    bgcolor: 'var(--paper-sunken)',
                    color: 'var(--ink-700)',
                  }}
                >
                  {badge}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Stack>

      <BookingPlate coach={coach} />
    </Paper>
  );
}

/**
 * Плашка «Запись» — тёмная и единственная, якорь страницы (07, 1.3).
 * Цена — самая низкая из своих тренировок: групповые занятия клуба
 * оплачиваются клубу, и их цена — не цена тренера (решение 21.10.2026).
 * Ближайшее занятие — по расписанию всех его тренировок. Кнопки связи —
 * те же, что были под шапкой: главная одна, WhatsApp с готовым текстом.
 */
function BookingPlate({ coach }: { readonly coach: CoachView }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const own = splitByOwner(coach.trainings).coach;
  const cheapest = cheapestOf(own.length > 0 ? own : coach.trainings);
  const slots = useMemo(
    () => coach.trainings.flatMap((training) => training.slots),
    [coach.trainings],
  );
  const next = useMemo(() => nextSession(slots, new Date()), [slots]);

  return (
    <Box
      data-booking-plate
      sx={{
        px: { xs: 2.5, sm: 4, md: 3 },
        py: { xs: 2.5, md: 3 },
        bgcolor: 'var(--night)',
        color: 'var(--night-ink-900)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 2,
        // Кнопки связи на тёмном: контурные — светлой линией. Главная — во всю
        // ширину, остальные на телефоне парой, в узкой плашке десктопа — столбиком.
        '& [data-coach-contacts]': { gridTemplateColumns: { xs: '1fr 1fr', md: '1fr' } },
        '& [data-coach-contacts] > :first-of-type': { gridColumn: '1 / -1' },
        '& [data-coach-contacts] .MuiButton-outlined': {
          color: 'var(--night-ink-900)',
          bgcolor: 'transparent',
          borderColor: 'var(--night-line-strong)',
          '&:hover': { borderColor: 'var(--night-ink-500)', bgcolor: 'var(--night-raised)' },
        },
        '& [data-coach-contacts] .MuiButton-root': {
          flexDirection: 'row',
          minHeight: 48,
          fontSize: 15,
        },
      }}
    >
      <Box>
        <Typography variant="caption" sx={{ color: 'var(--night-ink-500)', fontWeight: 600 }}>
          {t('coach.plate.title')}
        </Typography>
        <Typography
          component="p"
          data-plate-price
          sx={{
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 700,
            fontSize: cheapest === null ? 24 : { xs: 32, sm: 36 },
            lineHeight: cheapest === null ? '32px' : { xs: '40px', sm: '44px' },
          }}
        >
          {cheapest === null
            ? t('coach.price.negotiable')
            : fill(t('coach.price.from'), { price: formatMoney(cheapest.priceKzt, locale) })}
        </Typography>
        {cheapest !== null && cheapest.unit !== 'NONE' && (
          <Typography variant="body2" sx={{ color: 'var(--night-ink-700)' }}>
            {t(PRICE_UNIT_KEYS[cheapest.unit])}
          </Typography>
        )}
        {next !== null && (
          <Typography
            variant="body2"
            data-plate-next
            sx={{
              mt: 1,
              color: 'var(--night-ink-700)',
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
            }}
          >
            <CalendarClock size={15} aria-hidden />
            {nextSessionText(next, t, locale)}
          </Typography>
        )}
      </Box>

      <CoachContactActions coach={coach} />

      <Link
        component="a"
        href={`#${TRAININGS_ANCHOR}`}
        sx={{
          alignSelf: 'flex-start',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          minHeight: 44,
          typography: 'body2',
          fontWeight: 600,
          color: 'var(--night-red)',
        }}
      >
        {fill(t('coach.plate.all'), { count: formatCount(coach.trainings.length, locale) })}
        <ChevronDown size={16} aria-hidden />
      </Link>
    </Box>
  );
}

/** Тренировка с самой низкой указанной ценой; без цен — `null`. */
function cheapestOf(
  trainings: readonly TrainingView[],
): (TrainingView & { readonly priceKzt: number }) | null {
  let best: (TrainingView & { readonly priceKzt: number }) | null = null;

  for (const training of trainings) {
    if (training.priceKzt === null) continue;
    if (best === null || training.priceKzt < best.priceKzt) {
      best = { ...training, priceKzt: training.priceKzt };
    }
  }

  return best;
}
