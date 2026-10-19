import {
  COLORS,
  HANDLES,
  type AttributeDef,
  type BrandView,
  type OptionAxis,
  type ProductCategory,
} from '@kttf/shared/types';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { SlidersHorizontal } from 'lucide-react';
import { useId, useState, type ReactNode, type SyntheticEvent } from 'react';

import { fill, useLocale, useT } from '@/common/i18n';

import {
  THICKNESS_CHOICES,
  filterDefs,
  optionAxes,
  type CatalogDraft,
  type RangeDraft,
} from './catalog-search';
import { attributeLabel, optionAxisLabel, optionValueLabel, valueLabel } from './labels';

/** Сколько значений ещё помещается чипами; больше — выпадающим списком. */
const CHIPS_MAX = 8;

interface CatalogFilterProps {
  readonly category: ProductCategory;
  readonly initial: CatalogDraft;
  /** Производители категории — для выбора. */
  readonly brands: readonly BrandView[];
  readonly onSubmit: (draft: CatalogDraft) => void;
}

/**
 * Панель фильтров списка категории — `docs/10` 5.3.
 *
 * Состав — из описания категории (`PRODUCT_ATTRIBUTES`, `filter: true`) и
 * осей вариантов: новая характеристика в общем коде сама появляется здесь.
 * Условия набираются и применяются кнопкой «Найти», как в «Игроках»: в
 * «вес от 80» запрос за «8» не нужен никому. Чипы под панелью снимают
 * условие сразу.
 *
 * На телефоне видно поле названия и «Найти»; остальное раскрывает
 * «Фильтры (N)».
 */
export default function CatalogFilter({
  category,
  initial,
  brands,
  onSubmit,
}: CatalogFilterProps): ReactNode {
  const t = useT();
  const id = useId();
  const [draft, setDraft] = useState<CatalogDraft>(initial);
  const [open, setOpen] = useState(false);

  const defs = filterDefs(category);
  const axes = optionAxes(category);
  const extra =
    (draft.brands.length > 0 ? 1 : 0) +
    Object.values(draft.lists).filter((list) => list.length > 0).length +
    Object.values(draft.ranges).filter((range) => range.from !== '' || range.to !== '').length +
    Object.values(draft.flags).filter(Boolean).length;

  const setList = (key: string, values: readonly string[]): void => {
    setDraft((previous) => ({ ...previous, lists: { ...previous.lists, [key]: values } }));
  };
  const setRange = (key: string, range: RangeDraft): void => {
    setDraft((previous) => ({ ...previous, ranges: { ...previous.ranges, [key]: range } }));
  };

  const submit = (event: SyntheticEvent): void => {
    event.preventDefault();
    onSubmit(draft);
  };

  const selectedBrands = draft.brands
    .map((brandId) => brands.find((brand) => brand.id === brandId))
    .filter((brand) => brand !== undefined);

  return (
    <Box
      component="form"
      role="search"
      noValidate
      onSubmit={submit}
      sx={{
        mt: 3,
        display: 'grid',
        gap: 2,
        alignItems: 'start',
        gridTemplateColumns: {
          xs: '1fr 1fr',
          sm: 'repeat(6, minmax(0, 1fr))',
          md: 'repeat(12, minmax(0, 1fr))',
        },
      }}
    >
      <TextField
        type="search"
        label={t('market.filter.name')}
        value={draft.q}
        onChange={(event) => {
          setDraft((previous) => ({ ...previous, q: event.target.value }));
        }}
        autoComplete="off"
        sx={{ gridColumn: { xs: '1 / -1', sm: 'span 3', md: 'span 6' } }}
      />

      <Button
        variant="outlined"
        startIcon={<SlidersHorizontal size={18} aria-hidden />}
        aria-expanded={open}
        aria-controls={`${id}-more`}
        onClick={() => {
          setOpen((value) => !value);
        }}
        sx={{ display: { sm: 'none' }, minHeight: 48 }}
      >
        {extra > 0
          ? fill(t('market.filter.moreCount'), { count: String(extra) })
          : t('market.filter.more')}
      </Button>
      <Button type="submit" variant="contained" sx={{ display: { sm: 'none' }, minHeight: 48 }}>
        {t('market.filter.submit')}
      </Button>

      <Box
        id={`${id}-more`}
        sx={{
          display: { xs: open ? 'grid' : 'none', sm: 'contents' },
          gridColumn: '1 / -1',
          gap: 2,
        }}
      >
        <Autocomplete
          multiple
          options={brands}
          value={selectedBrands}
          onChange={(_, chosen) => {
            setDraft((previous) => ({ ...previous, brands: chosen.map((brand) => brand.id) }));
          }}
          getOptionLabel={(brand) => brand.name}
          isOptionEqualToValue={(option, chosen) => option.id === chosen.id}
          limitTags={2}
          noOptionsText={t('market.search.none')}
          renderInput={(params) => <TextField {...params} label={t('market.filter.brands')} />}
          sx={{ gridColumn: { sm: 'span 3', md: 'span 6' } }}
        />

        {defs.map((def) => (
          <AttributeControl
            key={def.key}
            def={def}
            draft={draft}
            onList={setList}
            onRange={setRange}
            onFlag={(key, value) => {
              setDraft((previous) => ({ ...previous, flags: { ...previous.flags, [key]: value } }));
            }}
          />
        ))}
        {axes.map((axis) => (
          <OptionControl
            key={axis}
            axis={axis}
            values={draft.lists[axis] ?? []}
            onChange={(values) => {
              setList(axis, values);
            }}
          />
        ))}
      </Box>

      <Button
        type="submit"
        variant="contained"
        sx={{
          display: { xs: 'none', sm: 'inline-flex' },
          gridColumn: '1 / -1',
          justifySelf: 'end',
          minHeight: 48,
          px: 4,
        }}
      >
        {t('market.filter.submit')}
      </Button>
    </Box>
  );
}

/** Подпись группы над чипами или полями — видимая, как у фильтров «Игроков». */
function GroupLabel({
  id,
  children,
}: {
  readonly id: string;
  readonly children: string;
}): ReactNode {
  return (
    <Typography id={id} component="div" variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
      {children}
    </Typography>
  );
}

/** Выбор нескольких из немногих — чипами-переключателями. */
function ChipChoice({
  label,
  values,
  selected,
  text,
  onChange,
}: {
  readonly label: string;
  readonly values: readonly string[];
  readonly selected: readonly string[];
  readonly text: (value: string) => string;
  readonly onChange: (next: readonly string[]) => void;
}): ReactNode {
  const id = useId();

  if (values.length > CHIPS_MAX) {
    return (
      <Autocomplete
        multiple
        options={[...values]}
        value={[...selected]}
        onChange={(_, chosen) => {
          onChange(chosen);
        }}
        getOptionLabel={text}
        limitTags={2}
        renderInput={(params) => <TextField {...params} label={label} />}
      />
    );
  }

  return (
    <Box role="group" aria-labelledby={id}>
      <GroupLabel id={id}>{label}</GroupLabel>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {values.map((value) => {
          const on = selected.includes(value);

          return (
            <Chip
              key={value}
              label={text(value)}
              clickable
              variant={on ? 'filled' : 'outlined'}
              aria-pressed={on}
              onClick={() => {
                onChange(on ? selected.filter((item) => item !== value) : [...selected, value]);
              }}
              sx={{ height: 44 }}
            />
          );
        })}
      </Box>
    </Box>
  );
}

function AttributeControl({
  def,
  draft,
  onList,
  onRange,
  onFlag,
}: {
  readonly def: AttributeDef;
  readonly draft: CatalogDraft;
  readonly onList: (key: string, values: readonly string[]) => void;
  readonly onRange: (key: string, range: RangeDraft) => void;
  readonly onFlag: (key: string, value: boolean) => void;
}): ReactNode {
  const t = useT();
  const id = useId();
  const label = attributeLabel(t, def.key);

  if (def.kind === 'enum' || def.kind === 'enums') {
    return (
      <Box sx={{ gridColumn: { sm: 'span 6', md: 'span 6' }, minWidth: 0 }}>
        <ChipChoice
          label={label}
          values={def.values}
          selected={draft.lists[def.key] ?? []}
          text={(value) => valueLabel(t, def.key, value)}
          onChange={(values) => {
            onList(def.key, values);
          }}
        />
      </Box>
    );
  }

  if (def.kind === 'number' || def.kind === 'numbers') {
    const range = draft.ranges[def.key] ?? { from: '', to: '' };
    const unit =
      def.unit === undefined ? undefined : (
        <InputAdornment position="end">{t(`market.unit.${def.unit}`)}</InputAdornment>
      );
    const field = (edge: 'from' | 'to'): ReactNode => (
      <TextField
        label={t(edge === 'from' ? 'market.filter.from' : 'market.filter.to')}
        value={range[edge]}
        onChange={(event) => {
          onRange(def.key, {
            ...range,
            [edge]: event.target.value.replace(/[^\d.,]/g, '').slice(0, 6),
          });
        }}
        slotProps={{
          htmlInput: {
            inputMode: 'decimal',
            'aria-describedby': id,
            placeholder: String(edge === 'from' ? def.min : def.max),
          },
          ...(unit === undefined ? {} : { input: { endAdornment: unit } }),
        }}
      />
    );

    return (
      <Box role="group" aria-labelledby={id} sx={{ gridColumn: { sm: 'span 3', md: 'span 3' } }}>
        <GroupLabel id={id}>{label}</GroupLabel>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          {field('from')}
          {field('to')}
        </Box>
      </Box>
    );
  }

  if (def.kind === 'bool') {
    return (
      <Box sx={{ gridColumn: { sm: 'span 3', md: 'span 3' }, alignSelf: 'end' }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={draft.flags[def.key] === true}
              onChange={(event) => {
                onFlag(def.key, event.target.checked);
              }}
            />
          }
          label={label}
          sx={{ minHeight: 48 }}
        />
      </Box>
    );
  }

  return null;
}

function OptionControl({
  axis,
  values,
  onChange,
}: {
  readonly axis: OptionAxis;
  readonly values: readonly string[];
  readonly onChange: (values: readonly string[]) => void;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const [text, setText] = useState(values.join(', '));
  const label = t(optionAxisLabel(axis));

  if (axis === 'size') {
    return (
      <TextField
        label={label}
        helperText={t('market.filter.listHint')}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          onChange(
            event.target.value
              .split(',')
              .map((part) => part.trim())
              .filter((part) => part !== ''),
          );
        }}
        sx={{ gridColumn: { sm: 'span 3', md: 'span 3' } }}
      />
    );
  }

  const choices: readonly string[] =
    axis === 'handle' ? HANDLES : axis === 'color' ? COLORS : THICKNESS_CHOICES;
  // Значение из ссылки, которого нет среди ходовых, остаётся выбранным.
  const all = [...choices, ...values.filter((value) => !choices.includes(value))];

  return (
    <Box sx={{ gridColumn: { sm: 'span 6', md: 'span 6' }, minWidth: 0 }}>
      <ChipChoice
        label={label}
        values={all}
        selected={values}
        text={(value) => optionValueLabel(t, locale, axis, value)}
        onChange={onChange}
      />
    </Box>
  );
}
