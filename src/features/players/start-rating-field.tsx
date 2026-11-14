import { RATING_LEVELS, ratingLevel, ratingLevelRange } from '@kttf/shared/rating';
import { START_RATING_MAX, START_RATING_MIN } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import { useState, type ReactNode } from 'react';

import { fill, useLocale, useT } from '@/common/i18n';
import { LEVEL_NAME } from '@/common/ui/level-name';

import { parseStartRating } from './start-rating-parse';
import { START_RATING_TEXTS } from './start-rating-texts';

interface StartRatingFieldProps {
  readonly value: number | null;
  /** `null` — поле пустое или число неверное: отправлять нечего. */
  readonly onChange: (rating: number | null) => void;
  readonly label: string;
  /** Подсказка под полем — там, где организатор видит поле впервые. */
  readonly withHint?: boolean;
}

/**
 * Стартовый рейтинг — точным числом, ADR-085 (было: шаг 25, ADR-062).
 *
 * Организатор часто знает рейтинг человека точно — тот играл в другой
 * системе — и вводит его как есть, до сотых. Кто не знает, оценивает по
 * уровню: под полем десять уровней, нажатие ставит нижнюю границу уровня, а
 * подпись поля сразу говорит, в какой уровень попадает введённое число.
 */
export default function StartRatingField({
  value,
  onChange,
  label,
  withHint = false,
}: StartRatingFieldProps): ReactNode {
  const t = useT();
  const texts = START_RATING_TEXTS[useLocale()];
  const [text, setText] = useState(value === null ? '' : String(value));
  const parsed = parseStartRating(text);
  const invalid = text.trim() !== '' && parsed === null;

  const levelLine =
    parsed === null
      ? undefined
      : fill(t('profile.plate.level'), {
          level: String(ratingLevel(parsed)),
          name: t(LEVEL_NAME[ratingLevel(parsed)]),
        });

  const set = (next: string): void => {
    setText(next);
    onChange(parseStartRating(next));
  };

  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      <TextField
        required
        label={label}
        value={text}
        error={invalid}
        helperText={
          invalid
            ? fill(texts.invalid, {
                min: String(START_RATING_MIN),
                max: String(START_RATING_MAX),
              })
            : (levelLine ?? (withHint ? texts.hint : undefined))
        }
        onChange={(event) => {
          set(event.target.value);
        }}
        slotProps={{ htmlInput: { inputMode: 'decimal', autoComplete: 'off' } }}
      />
      <Box role="group" aria-label={label} sx={{ display: 'flex', flexWrap: 'wrap', mx: -0.75 }}>
        {RATING_LEVELS.map((level) => {
          const from = ratingLevelRange(level).from;
          const active = parsed !== null && ratingLevel(parsed) === level;

          return (
            <Tooltip key={level} title={`${t(LEVEL_NAME[level])} · ${String(from)}+`}>
              <ButtonBase
                aria-label={`${t(LEVEL_NAME[level])}: ${String(from)}`}
                aria-pressed={active}
                onClick={() => {
                  set(String(from));
                }}
                // Касание — 44px (правило мобильной вёрстки), кружок внутри — 32px.
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  '&.Mui-focusVisible > span': {
                    outline: '2px solid var(--red-600)',
                    outlineOffset: '2px',
                  },
                }}
              >
                <Box
                  component="span"
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 700,
                    fontSize: 13,
                    fontVariantNumeric: 'tabular-nums',
                    border: '1.5px solid',
                    borderColor: active ? 'var(--red-600)' : 'var(--line)',
                    bgcolor: active ? 'var(--red-600)' : 'var(--paper)',
                    color: active ? 'var(--paper)' : 'text.primary',
                  }}
                >
                  {level}
                </Box>
              </ButtonBase>
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
}
