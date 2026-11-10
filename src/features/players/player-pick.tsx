import type { PlayerListItemView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Search } from 'lucide-react';
import type { ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';
import LevelBadge from '@/common/ui/level-badge';
import PlayerAvatar from '@/common/ui/player-avatar';
import RatingValue from '@/common/ui/rating-value';
import { usePlaceName } from '@/features/places/place-name';

import { playerName } from './player-name';

/** Поле поиска с лупой и признаком загрузки. */
export function PlayerSearchField({
  value,
  onChange,
  label,
  loading,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly label: string;
  readonly loading: boolean;
}): ReactNode {
  return (
    <TextField
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      type="search"
      autoComplete="off"
      label={label}
      fullWidth
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <Search size={18} aria-hidden />
            </InputAdornment>
          ),
          endAdornment: loading ? (
            <InputAdornment position="end">
              <CircularProgress size={18} aria-hidden />
            </InputAdornment>
          ) : undefined,
        },
      }}
    />
  );
}

/**
 * Карточка найденного профиля: фото, имя, город и год рождения — то, по
 * чему человек узнаёт себя среди однофамильцев, — уровень и рейтинг.
 * Справа — действие, которое передаёт место.
 */
export function PlayerCandidate({
  player,
  action,
  selected = false,
  note,
}: {
  readonly player: PlayerListItemView;
  readonly action: ReactNode;
  readonly selected?: boolean;
  /** Пояснение под карточкой выбранного профиля. */
  readonly note?: ReactNode;
}): ReactNode {
  const t = useT();
  const placeName = usePlaceName();

  return (
    <Box
      data-player-candidate={player.id}
      sx={{
        display: 'grid',
        gridTemplateColumns: 'auto minmax(0, 1fr) auto',
        alignItems: 'center',
        columnGap: 1.5,
        rowGap: 1,
        p: 1.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: selected ? 'var(--red-500)' : 'var(--line)',
        bgcolor: selected ? 'var(--red-50)' : 'background.paper',
      }}
    >
      <PlayerAvatar
        lastName={player.lastName}
        firstName={player.firstName}
        photoUrl={player.photoUrl}
        size="sm"
      />
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
          {playerName(player)}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 1 }}
        >
          <span>
            {placeName(player.city)}
            {' · '}
            {fill(t('pick.born'), { year: String(player.birthYear) })}
          </span>
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
            <LevelBadge rating={player.rating} size={22} />
            <RatingValue
              value={player.rating}
              animate={false}
              sx={{ fontWeight: 600, color: 'text.primary' }}
            />
          </Box>
        </Typography>
      </Box>
      <Box sx={{ justifySelf: 'end' }}>{action}</Box>
      {note !== undefined && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ gridColumn: '1 / -1' }}
          data-player-candidate-note
        >
          {note}
        </Typography>
      )}
    </Box>
  );
}
