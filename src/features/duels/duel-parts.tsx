import type { DuelItemView, DuelPlayer, DuelSlotView, DuelVenue } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { Clock, MapPin } from 'lucide-react';
import type { ReactNode } from 'react';

import { useLocale, useT } from '@/common/i18n';
import DeltaPill from '@/common/ui/delta-pill';
import PlayerAvatar from '@/common/ui/player-avatar';
import RatingValue from '@/common/ui/rating-value';
import { Badge } from '@/features/coaches/coach-cards';
import { splitName } from '@/features/forum/labels';
import { usePlaceName } from '@/features/places/place-name';

import {
  BEST_OF_KEYS,
  KIND_KEYS,
  STATUS_KEYS,
  STATUS_TONES,
  formatSlot,
  venueLines,
} from './labels';

/**
 * Игрок дуэли: фото, имя ссылкой на профиль, рейтинг и город — по ним
 * соперника выбирают «своего уровня рядом» (`docs/13` 1).
 */
export function DuelPlayerLine({
  player,
  meta,
  size = 'md',
}: {
  readonly player: DuelPlayer;
  readonly meta?: ReactNode;
  readonly size?: 'sm' | 'md';
}): ReactNode {
  const placeName = usePlaceName();
  const { lastName, firstName } = splitName(player.name);

  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', minWidth: 0 }}>
      <PlayerAvatar
        lastName={lastName}
        firstName={firstName}
        photoUrl={player.photoUrl}
        size={size}
      />
      <Box sx={{ minWidth: 0 }}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'baseline',
            columnGap: 1,
            rowGap: 0.25,
          }}
        >
          <Link
            href={`/players/${player.id}`}
            underline="hover"
            color="text.primary"
            sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}
          >
            {player.name}
          </Link>
          <RatingValue
            value={player.rating}
            animate={false}
            sx={{ fontSize: 14, fontWeight: 600, color: 'text.secondary' }}
          />
          <Typography component="span" variant="body2" color="text.secondary">
            {placeName(player.city)}
          </Typography>
        </Box>
        {meta}
      </Box>
    </Box>
  );
}

/**
 * Вид, «на рейтинг», формат и — по желанию — состояние: метками в строку.
 * Начатый матч — «Идёт матч», а не «Назначена»: состояние в базе то же,
 * но для людей это другой этап (ADR-068).
 */
export function DuelBadges({
  duel,
  status = false,
}: {
  readonly duel: Pick<DuelItemView, 'kind' | 'rated' | 'bestOf' | 'status'> & {
    readonly startedAt?: string | null;
  };
  readonly status?: boolean;
}): ReactNode {
  const t = useT();
  const live = duel.status === 'SCHEDULED' && typeof duel.startedAt === 'string';

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
      <Badge>{t(KIND_KEYS[duel.kind])}</Badge>
      {/* У дуэли рейтинг всегда — метка нужна только спаррингу. */}
      {duel.kind === 'SPARRING' && duel.rated && <Badge tone="ok">{t('duel.rated')}</Badge>}
      {duel.bestOf !== null && <Badge>{t(BEST_OF_KEYS[duel.bestOf])}</Badge>}
      {status && (
        <Badge tone={live ? 'warn' : STATUS_TONES[duel.status]}>
          {t(live ? 'duel.status.LIVE' : STATUS_KEYS[duel.status])}
        </Badge>
      )}
    </Box>
  );
}

/** Место: клуб KTTF ссылкой на его страницу или свой зал; адрес и город. */
export function VenueLine({ venue }: { readonly venue: DuelVenue }): ReactNode {
  const placeName = usePlaceName();
  const { name, address } = venueLines(venue);
  const city = placeName(venue.city);

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', minWidth: 0 }}>
      <Box component="span" sx={{ display: 'flex', mt: 0.25, color: 'text.secondary' }}>
        <MapPin size={16} aria-hidden />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        {venue.club === null ? (
          <Typography sx={{ fontWeight: 500, overflowWrap: 'anywhere' }}>{name}</Typography>
        ) : (
          <Link
            href={`/clubs/${venue.club.id}`}
            underline="hover"
            color="text.primary"
            sx={{ fontWeight: 500, overflowWrap: 'anywhere' }}
          >
            {name}
          </Link>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
          {address === null || address === '' ? city : `${city}, ${address}`}
        </Typography>
      </Box>
    </Box>
  );
}

/** Варианты времени автора — списком, по времени, как пришли. */
export function SlotList({ slots }: { readonly slots: readonly DuelSlotView[] }): ReactNode {
  const locale = useLocale();

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
      <Box component="span" sx={{ display: 'flex', mt: 0.25, color: 'text.secondary' }}>
        <Clock size={16} aria-hidden />
      </Box>
      <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
        {slots.map((slot) => (
          <Typography component="li" key={slot.id} sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatSlot(slot.startsAt, slot.endsAt, locale)}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

/**
 * Счёт сыгранной: «Ержанов 3:1 Смагулов» — победитель первым, как пишут
 * результат в зале. Партии — то, что внесли и подтвердили сами игроки.
 * С `deltas` рядом с именами — изменение рейтинга: в карточке «Сыгранных»
 * отдельного блока начисления нет.
 */
export function ScoreLine({
  duel,
  deltas = false,
}: {
  readonly duel: DuelItemView;
  readonly deltas?: boolean;
}): ReactNode {
  const { result, opponent } = duel;
  if (result === null || opponent === null) return null;

  const winner = result.winnerId === duel.author.id ? duel.author : opponent;
  const loser = winner === opponent ? duel.author : opponent;
  const delta = (playerId: string): ReactNode => {
    const change = deltas
      ? duel.ratingChanges.find((item) => item.playerId === playerId)
      : undefined;

    return change === undefined ? null : (
      <>
        {' '}
        <DeltaPill value={change.delta} />
      </>
    );
  };

  return (
    <Typography
      component="p"
      data-duel-score
      sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}
    >
      {winner.name}
      {delta(winner.id)}{' '}
      <Box component="span" sx={{ px: 0.5, color: 'var(--red-600)' }}>
        {result.winnerSets}:{result.loserSets}
      </Box>{' '}
      {loser.name}
      {delta(loser.id)}
    </Typography>
  );
}
