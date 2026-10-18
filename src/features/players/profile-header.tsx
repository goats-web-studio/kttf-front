import type { PlayerProfileView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Building2, Cake, MapPin, Pencil, Settings, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { fill, formatDate, useLocale, useT, type MessageKey } from '@/common/i18n';
import RatingValue from '@/common/ui/rating-value';

import { gripLabel, handLabel } from './player-labels';
import { playerName } from './player-name';
import ProfilePhoto from './profile-photo';

interface ProfileHeaderProps {
  readonly player: PlayerProfileView;
  readonly clubName: string | null;
  readonly cityName: string;
  /** Максимальный рейтинг из сводки; пока она не пришла — не показывается. */
  readonly maxRating: string | null;
  /** Свой профиль: кнопки правки и кабинета. */
  readonly isOwn: boolean;
}

/**
 * Шапка профиля в структуре RTTF — ADR-048.
 *
 * Слева человек: фото, имя, город, клуб, год рождения и анкета — рука,
 * хват, основание, накладки, «о себе». Справа рейтинг крупно и максимальный:
 * ради этого числа страницу и открывают. Анкета показывается только
 * заполненная — десять строк «не указано» это шум.
 */
export default function ProfileHeader({
  player,
  clubName,
  cityName,
  maxRating,
  isOwn,
}: ProfileHeaderProps): ReactNode {
  const t = useT();
  const locale = useLocale();

  const details: readonly (readonly [MessageKey, string | null])[] = [
    ['player.form.playingHand', handLabel(player.playingHand, t)],
    ['player.form.grip', gripLabel(player.grip, t)],
    ['player.form.blade', player.blade],
    ['player.form.rubberForehand', player.rubberForehand],
    ['player.form.rubberBackhand', player.rubberBackhand],
    ['player.form.coach', player.coachName],
    ['player.form.bio', player.bio],
    ['profile.since', since(player, locale, t)],
  ];

  return (
    <Paper
      variant="outlined"
      component="header"
      sx={{
        p: { xs: 2.5, sm: 4 },
        display: 'grid',
        gap: { xs: 3, md: 4 },
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) auto' },
        alignItems: 'start',
        backgroundImage: 'radial-gradient(circle at 100% 0%, var(--red-50) 0, transparent 38%)',
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={{ xs: 2, sm: 3 }} sx={{ alignItems: 'center' }}>
          <ProfilePhoto
            lastName={player.lastName}
            firstName={player.firstName}
            photoUrl={player.photoUrl}
          />
          <Box sx={{ minWidth: 0 }}>
            <Stack
              direction="row"
              useFlexGap
              spacing={1.5}
              sx={{ alignItems: 'center', flexWrap: 'wrap' }}
            >
              <Typography
                variant="h1"
                sx={{ fontSize: { xs: 26, sm: 34 }, lineHeight: { xs: '30px', sm: '40px' } }}
              >
                {playerName(player)}
              </Typography>
              {player.online && <Online />}
            </Stack>
            <Stack
              direction="row"
              useFlexGap
              spacing={2}
              sx={{ mt: 1, flexWrap: 'wrap', color: 'text.secondary', typography: 'body2' }}
            >
              <Meta icon={MapPin}>{cityName}</Meta>
              {clubName !== null && <Meta icon={Building2}>{clubName}</Meta>}
              <Meta icon={Cake}>{String(player.birthYear)}</Meta>
            </Stack>
          </Box>
        </Stack>

        <Box
          component="dl"
          sx={{
            mt: 3,
            mb: 0,
            display: 'grid',
            gridTemplateColumns: 'max-content minmax(0, 1fr)',
            columnGap: 3,
            rowGap: 0.75,
            typography: 'body2',
            '& dt': { color: 'text.secondary' },
            '& dd': { m: 0, overflowWrap: 'anywhere' },
          }}
        >
          {details.map(([label, value]) =>
            value === null || value === '' ? null : (
              <Box key={label} sx={{ display: 'contents' }}>
                <dt>{t(label)}</dt>
                <dd>{value}</dd>
              </Box>
            ),
          )}
        </Box>

        {isOwn && (
          // Правка анкеты — в «Настройках», рабочий стол — в кабинете.
          <Stack direction="row" useFlexGap spacing={1} sx={{ mt: 3, flexWrap: 'wrap' }}>
            <Button href="/settings/profile" startIcon={<Pencil size={16} aria-hidden />}>
              {t('profile.edit')}
            </Button>
            <Button
              variant="text"
              href="/cabinet"
              startIcon={<Settings size={16} aria-hidden />}
              sx={{ color: 'text.secondary' }}
            >
              {t('profile.settings')}
            </Button>
          </Stack>
        )}
      </Box>

      {/* Рейтинг — главное число профиля, дисплейный набор (07, 3.5). */}
      <Box
        sx={{
          px: 3,
          py: 2.5,
          borderRadius: 4,
          bgcolor: 'var(--paper-sunken)',
          textAlign: { md: 'right' },
          minWidth: { md: 200 },
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
          {t('ratings.column.rating')}
        </Typography>
        <Typography variant="h1" component="p" sx={{ fontSize: 48, lineHeight: '52px' }}>
          <RatingValue value={player.rating} />
        </Typography>
        {maxRating !== null && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t('profile.maxRating')} <RatingValue value={maxRating} sx={{ fontWeight: 600 }} />
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          {t('player.rating.matches')}{' '}
          <Box component="span" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {player.ratedMatches}
          </Box>
          {player.isProvisional && (
            // Провизорный рейтинг двигается быстрее: сыграно меньше
            // двадцати рейтинговых встреч (ТЗ 7.1).
            <> · {t('ratings.provisional')}</>
          )}
        </Typography>
      </Box>
    </Paper>
  );
}

/**
 * «На сайте с 12 марта 2025 (последнее посещение: 18 октября)». Посещение —
 * только у игрока с аккаунтом: у заведённого организатором его нет (ADR-050).
 */
function since(
  player: PlayerProfileView,
  locale: ReturnType<typeof useLocale>,
  t: (key: MessageKey) => string,
): string {
  const joined = formatDate(player.createdAt, locale);

  return player.lastSeenAt === null
    ? joined
    : `${joined} ${fill(t('profile.lastSeen'), { date: formatDate(player.lastSeenAt, locale) })}`;
}

/**
 * «В сети» — зелёная точка и слово: цвет не единственный носитель (07, 9).
 * `--ok` на белом даёт 5.35:1, слово читается и без точки.
 */
function Online(): ReactNode {
  const t = useT();

  return (
    <Box
      component="span"
      data-online
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        typography: 'body2',
        fontWeight: 600,
        color: 'var(--ok)',
      }}
    >
      <Box
        component="span"
        aria-hidden
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: 'var(--ok)',
          boxShadow: '0 0 0 3px var(--ok-50)',
        }}
      />
      {t('profile.online')}
    </Box>
  );
}

/** Факт о человеке с иконкой: город, клуб, год рождения. */
function Meta({
  icon: Icon,
  children,
}: {
  readonly icon: LucideIcon;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
      <Icon size={15} aria-hidden />
      {children}
    </Box>
  );
}
