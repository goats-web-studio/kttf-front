import {
  COLORS,
  HANDLES,
  PRODUCT_ATTRIBUTES,
  PRODUCT_OPTION_AXES,
  type AttributeDef,
  type ProductCategory,
} from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useId, type ReactNode } from 'react';

import { fill, useLocale, useT, type MessageKey } from '@/common/i18n';

import { attributeLabel, optionAxisLabel, optionValueLabel, valueLabel } from '../labels';
import {
  isOptionValue,
  type AttrInput,
  type AttrProblem,
  type AttrsDraft,
  type OptionsDraft,
} from './attrs-form';
import TagInput from './tag-input';

const PROBLEM_TEXT: Readonly<Record<AttrProblem, MessageKey>> = {
  number: 'catalog.form.notNumber',
  range: 'catalog.form.outOfRange',
};

/**
 * Поля характеристик — по описанию категории: перечисление — выбором,
 * несколько из перечисления — чипами, число — полем с единицей, несколько
 * чисел — через запятую, да/нет — флажком, текст — строкой.
 */
export function AttributesForm({
  category,
  draft,
  problems,
  onChange,
}: {
  readonly category: ProductCategory;
  readonly draft: AttrsDraft;
  readonly problems: Readonly<Record<string, AttrProblem>>;
  readonly onChange: (key: string, value: AttrInput) => void;
}): ReactNode {
  const defs = PRODUCT_ATTRIBUTES[category];
  const t = useT();

  if (defs.length === 0) {
    return <Typography color="text.secondary">{t('catalog.form.noAttributes')}</Typography>;
  }

  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
      {defs.map((def) => (
        <AttributeField
          key={def.key}
          def={def}
          value={draft[def.key]}
          problem={problems[def.key]}
          onChange={(value) => {
            onChange(def.key, value);
          }}
        />
      ))}
    </Box>
  );
}

function AttributeField({
  def,
  value,
  problem,
  onChange,
}: {
  readonly def: AttributeDef;
  readonly value: AttrInput;
  readonly problem: AttrProblem | undefined;
  readonly onChange: (value: AttrInput) => void;
}): ReactNode {
  const t = useT();
  const id = useId();
  const label = attributeLabel(t, def.key);
  const error = problem === undefined ? undefined : t(PROBLEM_TEXT[problem]);

  switch (def.kind) {
    case 'enum':
      return (
        <TextField
          select
          label={label}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        >
          <MenuItem value="">{t('catalog.form.unset')}</MenuItem>
          {def.values.map((item) => (
            <MenuItem key={item} value={item}>
              {valueLabel(t, def.key, item)}
            </MenuItem>
          ))}
        </TextField>
      );
    case 'enums': {
      const selected = typeof value === 'object' ? value : [];

      return (
        <Box role="group" aria-labelledby={id} sx={{ gridColumn: '1 / -1' }}>
          <Typography
            id={id}
            variant="caption"
            color="text.secondary"
            component="div"
            sx={{ mb: 0.5 }}
          >
            {label}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {def.values.map((item) => {
              const on = selected.includes(item);

              return (
                <Chip
                  key={item}
                  label={valueLabel(t, def.key, item)}
                  clickable
                  variant={on ? 'filled' : 'outlined'}
                  aria-pressed={on}
                  onClick={() => {
                    onChange(on ? selected.filter((v) => v !== item) : [...selected, item]);
                  }}
                  sx={{ height: 44 }}
                />
              );
            })}
          </Box>
        </Box>
      );
    }
    case 'number':
    case 'numbers':
      return (
        <TextField
          label={label}
          value={typeof value === 'string' ? value : ''}
          error={error !== undefined}
          helperText={
            error ??
            (def.kind === 'numbers'
              ? t('catalog.form.numbersHint')
              : fill(t('catalog.form.bounds'), { min: String(def.min), max: String(def.max) }))
          }
          onChange={(event) => {
            onChange(event.target.value);
          }}
          slotProps={{
            htmlInput: { inputMode: def.kind === 'number' ? 'decimal' : 'text' },
            ...(def.unit === undefined
              ? {}
              : {
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">{t(`market.unit.${def.unit}`)}</InputAdornment>
                    ),
                  },
                }),
          }}
        />
      );
    case 'bool':
      return (
        <FormControlLabel
          control={
            <Checkbox
              checked={value === true}
              onChange={(event) => {
                onChange(event.target.checked);
              }}
            />
          }
          label={label}
          sx={{ minHeight: 48 }}
        />
      );
    case 'text':
      return (
        <TextField
          label={label}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          slotProps={{ htmlInput: { maxLength: def.max } }}
        />
      );
  }
}

/**
 * Варианты по осям категории: ручка и цвет — чипами из перечислений,
 * толщина и размер — набором значений с проверкой на месте.
 */
export function OptionsForm({
  category,
  draft,
  onChange,
}: {
  readonly category: ProductCategory;
  readonly draft: OptionsDraft;
  readonly onChange: (next: OptionsDraft) => void;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const axes = PRODUCT_OPTION_AXES[category];

  if (axes.length === 0) {
    return <Typography color="text.secondary">{t('catalog.form.noOptions')}</Typography>;
  }

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      {axes.map((axis) => {
        const values = draft[axis] ?? [];
        const set = (next: readonly string[]): void => {
          onChange({ ...draft, [axis]: next });
        };

        if (axis === 'thickness' || axis === 'size') {
          return (
            <TagInput
              key={axis}
              label={t(optionAxisLabel(axis))}
              helperText={t(
                axis === 'thickness' ? 'catalog.form.thicknessHint' : 'catalog.form.sizeHint',
              )}
              values={values}
              onChange={set}
              valid={(value) => isOptionValue(axis, value)}
            />
          );
        }

        const choices: readonly string[] = axis === 'handle' ? HANDLES : COLORS;

        return (
          <Box key={axis} role="group" aria-label={t(optionAxisLabel(axis))}>
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>
              {t(optionAxisLabel(axis))}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {choices.map((item) => {
                const on = values.includes(item);

                return (
                  <Chip
                    key={item}
                    label={optionValueLabel(t, locale, axis, item)}
                    clickable
                    variant={on ? 'filled' : 'outlined'}
                    aria-pressed={on}
                    onClick={() => {
                      set(on ? values.filter((v) => v !== item) : [...values, item]);
                    }}
                    sx={{ height: 44 }}
                  />
                );
              })}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
