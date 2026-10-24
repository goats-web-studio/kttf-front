import { ratingLevel, type RatingLevel } from '@kttf/shared/rating';
import { START_RATING_MAX, START_RATING_MIN, START_RATING_STEP } from '@kttf/shared/types';
import ListSubheader from '@mui/material/ListSubheader';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import type { ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';
import { LEVEL_NAME } from '@/common/ui/level-name';

/** Оценки на выбор: 100, 125 … 1000 — ADR-062. */
const RATINGS = Array.from(
  { length: (START_RATING_MAX - START_RATING_MIN) / START_RATING_STEP + 1 },
  (_unused, index) => START_RATING_MIN + index * START_RATING_STEP,
);

/** Оценки, разложенные по уровням игры (ADR-070): уровень — заголовок группы. */
const GROUPS: readonly { readonly level: RatingLevel; readonly ratings: readonly number[] }[] =
  RATINGS.reduce<{ level: RatingLevel; ratings: number[] }[]>((groups, rating) => {
    const level = ratingLevel(rating);
    const last = groups.at(-1);

    if (last?.level === level) last.ratings.push(rating);
    else groups.push({ level, ratings: [rating] });

    return groups;
  }, []);

interface StartRatingFieldProps {
  readonly value: number | null;
  readonly onChange: (rating: number) => void;
  readonly label: string;
  readonly helperText?: string;
}

/**
 * Стартовый рейтинг по уровню игры — ADR-062, ADR-072.
 *
 * Организатор в зале оценивает человека уровнем — «уверенный любитель»,
 * «сильный», — а не числом. Поэтому числа сгруппированы под уровнями: сначала
 * глаз находит уровень, внутри него — точку с шагом 25.
 */
export default function StartRatingField({
  value,
  onChange,
  label,
  helperText,
}: StartRatingFieldProps): ReactNode {
  const t = useT();

  return (
    <TextField
      select
      required
      label={label}
      value={value === null ? '' : String(value)}
      helperText={helperText}
      onChange={(event) => {
        onChange(Number(event.target.value));
      }}
      slotProps={{ select: { MenuProps: { slotProps: { paper: { sx: { maxHeight: 360 } } } } } }}
    >
      {GROUPS.flatMap((group) => [
        <ListSubheader key={`level-${String(group.level)}`} sx={{ lineHeight: '36px' }}>
          {fill(t('profile.plate.level'), {
            level: String(group.level),
            name: t(LEVEL_NAME[group.level]),
          })}
        </ListSubheader>,
        ...group.ratings.map((rating) => (
          <MenuItem key={rating} value={String(rating)} sx={{ pl: 4 }}>
            {rating}
          </MenuItem>
        )),
      ])}
    </TextField>
  );
}
