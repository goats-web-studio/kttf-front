import type { ClubView, TournamentView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import CardActionArea from '@mui/material/CardActionArea';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { formatDateParts, formatMoney, useLocale, useT } from '@/common/i18n';
import { usePlaceName } from '@/features/places/place-name';

import { TOURNAMENT_LEVEL_KEYS } from './labels';
import StatusBadge from './status-badge';

interface TournamentCardProps {
  readonly tournament: TournamentView;
  /** Из справочника клубов; до его ответа строка клуба просто пуста. */
  readonly club: ClubView | undefined;
}

/**
 * Турнир в календаре — docs/07-design-system.md, 5.2, `TournamentCard`.
 *
 * Слева дата плашкой: календарь пробегают глазами по дням, и число набрано
 * дисплейным шрифтом — это якорь строки. Справа то, что решает «идти или
 * нет»: название, клуб с городом, состояние, уровень и взнос.
 *
 * Вся карточка — одна ссылка (`CardActionArea` с `href`): на телефоне
 * попадать пальцем именно в название не нужно. Доступное имя ссылки —
 * название турнира, остальное читается как описание.
 */
export default function TournamentCard({ tournament, club }: TournamentCardProps): ReactNode {
  const t = useT();
  const placeName = usePlaceName();
  const locale = useLocale();
  const date = formatDateParts(tournament.startsAt, locale);
  const titleId = `tournament-${tournament.id}`;

  return (
    <CardActionArea
      href={`/tournaments/${tournament.id}`}
      aria-labelledby={titleId}
      sx={{ display: 'flex', alignItems: 'stretch', gap: { xs: 2, sm: 3 }, py: 2, px: { sm: 1.5 } }}
    >
      <Box
        component="time"
        dateTime={tournament.startsAt}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: { xs: 56, sm: 64 },
          flexShrink: 0,
          pr: 2,
          borderRight: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h2" component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {date.day}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {date.month}
        </Typography>
        {date.year !== undefined && (
          <Typography variant="caption" color="text.secondary">
            {date.year}
          </Typography>
        )}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 0.5, fontVariantNumeric: 'tabular-nums' }}
        >
          {date.time}
        </Typography>
      </Box>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography id={titleId} variant="h3" component="h2">
          {tournament.name}
        </Typography>
        {club !== undefined && (
          <Typography variant="body2" color="text.secondary" noWrap>
            {club.name} · {placeName(club.city)}
          </Typography>
        )}
        <Stack
          direction="row"
          useFlexGap
          spacing={1.5}
          sx={{ mt: 1, flexWrap: 'wrap', alignItems: 'center', color: 'text.secondary' }}
        >
          <StatusBadge status={tournament.status} />
          <Typography variant="body2">{t(TOURNAMENT_LEVEL_KEYS[tournament.level])}</Typography>
          <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {tournament.entryFee === 0
              ? t('tournament.entryFee.free')
              : formatMoney(tournament.entryFee, locale)}
          </Typography>
        </Stack>
      </Box>
    </CardActionArea>
  );
}
