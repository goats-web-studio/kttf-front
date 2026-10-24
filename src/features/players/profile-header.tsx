import { ratingLevel } from '@kttf/shared/rating';
import type { PlayerProfileView, PlayerSummaryView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  BadgeCheck,
  Building2,
  Cake,
  Hand,
  MapPin,
  Pencil,
  Settings,
  Swords,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { fill, formatCount, useLocale, useT, type MessageKey } from '@/common/i18n';
import DeltaPill from '@/common/ui/delta-pill';
import LevelBadge from '@/common/ui/level-badge';
import { LEVEL_NAME } from '@/common/ui/level-name';
import RatingValue from '@/common/ui/rating-value';

import FormStrip from './form-strip';
import { playerName } from './player-name';
import ProfilePhoto from './profile-photo';
import { playerTournamentsQuery } from './queries';

interface ProfileHeaderProps {
  readonly player: PlayerProfileView;
  readonly cityName: string;
  readonly club: { readonly id: string; readonly name: string } | null;
  /** Сводка за всё время: место и максимум. Пока не пришла — их нет. */
  readonly summary: PlayerSummaryView | undefined;
  /** Свой профиль: кнопки правки и кабинета. */
  readonly isOwn: boolean;
  /** «Сравнить со мной» — у вошедшего игрока на чужом профиле. */
  readonly onCompare?: (() => void) | undefined;
}

/**
 * Шапка профиля — визитка игрока (ADR-048, ADR-060).
 *
 * Слева человек: фото, имя, «в сети», город, клуб, год рождения и метки —
 * рука, хват, «Тренер KTTF». Под ними «Форма» — последние встречи точками.
 * Справа тёмная плашка рейтинга — главный акцент страницы: число, место в
 * рейтинге, максимум и изменение за последний турнир. Плашка — правая
 * колонка самой карточки, вровень с её краем: карточка внутри карточки
 * читалась как шаблон. Анкета списком
 * «подпись — значение» ушла: инвентарь, тренер и «о себе» — в карточках
 * под шапкой, где их видно сразу и крупно.
 */
export default function ProfileHeader({
  player,
  cityName,
  club,
  summary,
  isOwn,
  onCompare,
}: ProfileHeaderProps): ReactNode {
  const t = useT();
  const chips = playerChips(player, t);

  return (
    <Paper
      variant="outlined"
      component="header"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) 296px' },
        alignItems: 'stretch',
        overflow: 'hidden',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 2, sm: 3 }}
        sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, minWidth: 0, p: { xs: 2.5, sm: 4 } }}
      >
        <Box sx={{ position: 'relative', flexShrink: 0 }}>
          <ProfilePhoto
            lastName={player.lastName}
            firstName={player.firstName}
            photoUrl={player.photoUrl}
          />
          {player.online && <OnlineDot />}
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
            {club !== null && (
              <Meta icon={Building2}>
                <Link href={`/clubs/${club.id}`} color="inherit">
                  {club.name}
                </Link>
              </Meta>
            )}
            <Meta icon={Cake}>{String(player.birthYear)}</Meta>
          </Stack>

          {(chips.length > 0 || player.ownCoachSlug !== null) && (
            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {player.ownCoachSlug !== null && (
                <Chip href={`/coaches/${player.ownCoachSlug}`} icon={BadgeCheck} accent>
                  {t('profile.chip.coach')}
                </Chip>
              )}
              {chips.map((chip) => (
                <Chip key={chip} icon={Hand}>
                  {chip}
                </Chip>
              ))}
            </Box>
          )}

          <Box sx={{ mt: 2 }}>
            <FormStrip playerId={player.id} />
          </Box>

          {isOwn ? (
            // Правка анкеты — в «Настройках», рабочий стол — в кабинете.
            <Stack direction="row" useFlexGap spacing={1} sx={{ mt: 2.5, flexWrap: 'wrap' }}>
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
          ) : (
            onCompare !== undefined && (
              <Button
                onClick={onCompare}
                startIcon={<Swords size={16} aria-hidden />}
                sx={{ mt: 2.5, minHeight: 44 }}
                data-compare
              >
                {t('profile.compare')}
              </Button>
            )
          )}
        </Box>
      </Stack>

      <RatingPlate player={player} summary={summary} />
    </Paper>
  );
}

/**
 * Плашка рейтинга — тёмная, единственная на странице: якорь, к которому
 * глаз идёт первым (07, 1.3). Число — дисплейным кеглем, табличными цифрами.
 */
function RatingPlate({
  player,
  summary,
}: {
  readonly player: PlayerProfileView;
  readonly summary: PlayerSummaryView | undefined;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const results = useInfiniteQuery(playerTournamentsQuery(player.id));
  // Изменение за последний турнир с итогом: у идущего его ещё нет.
  const last = results.data?.pages[0]?.items.find((item) => item.delta !== null);

  return (
    <Box
      data-rating-plate
      sx={{
        px: { xs: 2.5, sm: 4, md: 3 },
        py: { xs: 2.5, md: 3 },
        bgcolor: 'var(--night)',
        color: 'var(--night-ink-900)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <Typography variant="caption" sx={{ color: 'var(--night-ink-500)', fontWeight: 600 }}>
        {t('ratings.column.rating')}
      </Typography>
      <Typography
        component="p"
        sx={{
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 700,
          fontSize: { xs: 48, sm: 56 },
          lineHeight: { xs: '56px', sm: '64px' },
        }}
      >
        <RatingValue value={player.rating} />
      </Typography>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 1 }} data-level-row>
        <LevelBadge rating={player.rating} tone="night" />
        <Typography sx={{ fontWeight: 600 }}>
          {fill(t('profile.plate.level'), {
            level: String(ratingLevel(Number(player.rating))),
            name: t(LEVEL_NAME[ratingLevel(Number(player.rating))]),
          })}
        </Typography>
      </Stack>
      {summary !== undefined && summary.rankedPlayers > 0 && (
        <Typography sx={{ fontWeight: 600 }} data-rank>
          {fill(t('profile.plate.rank'), {
            rank: formatCount(summary.rank, locale),
            total: formatCount(summary.rankedPlayers, locale),
          })}
        </Typography>
      )}

      {player.isProvisional && (
        // Новичок — первые пять рейтинговых турниров: его рейтинг растёт
        // вдвое быстрее, чем падает (ТЗ 7.4, ADR-069).
        <Typography variant="body2" sx={{ color: 'var(--night-ink-500)' }} data-provisional>
          {t('profile.plate.provisional')}
        </Typography>
      )}

      <Box
        sx={{
          mt: 2,
          pt: 2,
          borderTop: '1px solid var(--night-line)',
          display: 'grid',
          gap: 0.75,
          typography: 'body2',
          color: 'var(--night-ink-700)',
        }}
      >
        {summary !== undefined && (
          <PlateRow label={t('profile.maxRating')}>
            <RatingValue value={summary.maxRating} sx={{ fontWeight: 600 }} />
          </PlateRow>
        )}
        <PlateRow label={t('profile.plate.matches')}>
          {formatCount(player.ratedMatches, locale)}
        </PlateRow>
        {last?.delta != null && (
          <PlateRow label={t('profile.plate.last')}>
            <DeltaPill value={last.delta} />
          </PlateRow>
        )}
      </Box>
    </Box>
  );
}

function PlateRow({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
      <span>{label}</span>
      <Box
        component="span"
        sx={{ color: 'var(--night-ink-900)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
      >
        {children}
      </Box>
    </Box>
  );
}

/** «Правша», «Европейский хват» — метки шапки. Незнакомое значение — как есть. */
function playerChips(player: PlayerProfileView, t: (key: MessageKey) => string): string[] {
  const hand =
    player.playingHand === 'RIGHT' || player.playingHand === 'LEFT'
      ? t(`profile.chip.hand.${player.playingHand}`)
      : player.playingHand;
  const grip =
    player.grip === 'SHAKEHAND' || player.grip === 'PENHOLD'
      ? t(`profile.chip.grip.${player.grip}`)
      : player.grip;

  return [hand, grip].filter((chip): chip is string => chip !== null && chip !== '');
}

/** Метка шапки; «Тренер KTTF» — красная и ссылкой на его страницу. */
function Chip({
  icon: Icon,
  href,
  accent = false,
  children,
}: {
  readonly icon: LucideIcon;
  readonly href?: string;
  readonly accent?: boolean;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <Box
      component={href === undefined ? 'span' : 'a'}
      href={href}
      data-chip
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        height: 32,
        px: 1.5,
        borderRadius: 999,
        typography: 'body2',
        fontWeight: 600,
        textDecoration: 'none',
        ...(accent
          ? {
              bgcolor: 'var(--red-50)',
              color: 'var(--red-700)',
              boxShadow: 'inset 0 0 0 1px var(--red-200)',
              '@media (hover: hover)': { '&:hover': { bgcolor: 'var(--red-100)' } },
            }
          : { bgcolor: 'var(--paper-sunken)', color: 'var(--ink-700)' }),
        '&:focus-visible': { outline: '2px solid var(--red-600)', outlineOffset: '2px' },
      }}
    >
      <Icon size={15} aria-hidden />
      {children}
    </Box>
  );
}

/** Зелёная точка на фото — «в сети» видно и без слова рядом с именем. */
function OnlineDot(): ReactNode {
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        position: 'absolute',
        right: { xs: 6, sm: 10 },
        bottom: { xs: 6, sm: 10 },
        width: 18,
        height: 18,
        borderRadius: '50%',
        bgcolor: 'var(--ok)',
        border: '3px solid var(--paper)',
        pointerEvents: 'none',
      }}
    />
  );
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
