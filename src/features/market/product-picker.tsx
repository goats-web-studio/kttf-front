import { catalogImageVariant, type ProductCategory } from '@kttf/shared/types';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';

import { queryString } from '@/common/api';
import { useT } from '@/common/i18n';

import { pickedOf, rememberProductLabel, type PickedProduct } from './picked-product';
import { suggestQuery } from './queries';

const SETTLE_MS = 250;
const MIN_LENGTH = 2;

interface ProductPickerProps {
  readonly category: ProductCategory;
  readonly label: string;
  readonly value: PickedProduct | null;
  readonly onChange: (product: PickedProduct | null) => void;
  readonly helperText?: string;
  /** Текст поиска сразу — администратор сопоставляет строку анкеты с товаром. */
  readonly initialText?: string;
  readonly size?: 'small' | 'medium';
}

/**
 * Выбор товара каталога с подсказками при вводе — `docs/10` 3.1, M1.2.
 *
 * Тот же поиск, что у маркета: по названию, производителю и русским
 * написаниям, — поэтому подсказки не отсеиваются на клиенте. В подсказке —
 * фото, производитель и название: «Viscaria» бывает у двух фирм.
 */
export default function ProductPicker({
  category,
  label,
  value,
  onChange,
  helperText,
  initialText,
  size = 'medium',
}: ProductPickerProps): ReactNode {
  const t = useT();
  const [text, setText] = useState(initialText ?? value?.label ?? '');
  const [settled, setSettled] = useState(text.trim());

  useEffect(() => {
    const timer = setTimeout(() => {
      setSettled(text.trim());
    }, SETTLE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [text]);

  const ready = settled.length >= MIN_LENGTH && settled !== value?.label;
  const suggestions = useQuery({
    ...suggestQuery(queryString({ q: settled, category, limit: 8 })),
    enabled: ready,
  });
  const options = (ready ? (suggestions.data ?? []) : []).map(pickedOf);

  return (
    <Autocomplete<PickedProduct>
      options={value === null ? options : [value, ...options.filter((o) => o.id !== value.id)]}
      value={value}
      filterOptions={(list) => list}
      inputValue={text}
      onInputChange={(_, next) => {
        setText(next);
      }}
      onChange={(_, next) => {
        if (next !== null) rememberProductLabel(next.id, next.label);
        onChange(next);
      }}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, chosen) => option.id === chosen.id}
      getOptionKey={(option) => option.id}
      loading={ready && suggestions.isFetching}
      loadingText={t('common.loading')}
      noOptionsText={
        settled.length < MIN_LENGTH ? t('market.picker.typeMore') : t('market.search.none')
      }
      clearText={t('market.picker.clear')}
      openText={t('market.picker.open')}
      closeText={t('market.picker.close')}
      size={size}
      renderOption={({ key, ...props }, option) => (
        <Box component="li" key={key} {...props} sx={{ gap: 1.5, minHeight: 48 }}>
          <Thumb image={option.image} size={40} />
          <Box sx={{ minWidth: 0 }}>
            {option.brand !== undefined && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {option.brand}
              </Typography>
            )}
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {option.name ?? option.label}
            </Typography>
          </Box>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          helperText={helperText}
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps.input,
              ...(value?.image == null
                ? {}
                : {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Thumb image={value.image} size={24} />
                      </InputAdornment>
                    ),
                  }),
            },
          }}
        />
      )}
    />
  );
}

/** Маленькое фото товара; без фото — серый квадрат той же величины. */
export function Thumb({
  image,
  size,
}: {
  readonly image: { readonly url: string } | null | undefined;
  readonly size: number;
}): ReactNode {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 1.5,
        overflow: 'hidden',
        bgcolor: 'var(--ink-100)',
      }}
    >
      {image !== null && image !== undefined && (
        <Box
          component="img"
          src={catalogImageVariant(image.url, 240)}
          width={size}
          height={size}
          alt=""
          loading="lazy"
          sx={{
            display: 'block',
            width: size,
            height: size,
            objectFit: 'contain',
            bgcolor: 'var(--paper)',
          }}
        />
      )}
    </Box>
  );
}
