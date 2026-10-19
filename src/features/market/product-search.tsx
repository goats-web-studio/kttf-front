import { catalogImageVariant, type ProductListItemView } from '@kttf/shared/types';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { queryString } from '@/common/api';
import { useT } from '@/common/i18n';

import { suggestQuery } from './queries';

/** Пауза после последней буквы перед подсказками и минимум букв — как у сервера. */
const SETTLE_MS = 250;
const MIN_LENGTH = 2;

interface ProductSearchProps {
  readonly initial?: string;
  /** Выбрана подсказка — открыть товар. */
  readonly onPick: (product: ProductListItemView) => void;
  /** Enter без выбранной подсказки — искать набранное. */
  readonly onSubmit: (text: string) => void;
}

/**
 * Поиск товара с подсказками при вводе — `docs/10` 3.1.
 *
 * Сервер ищет по названию, производителю и русским написаниям с опечатками
 * («Тенерджи», «Лебессон»): подсказки приходят уже отобранными, и
 * отсеивать их на клиенте нельзя — фильтр по буквам выкинул бы «Tenergy»
 * на запрос «тенерджи».
 */
export default function ProductSearch({
  initial = '',
  onPick,
  onSubmit,
}: ProductSearchProps): ReactNode {
  const t = useT();
  const [text, setText] = useState(initial);
  const [settled, setSettled] = useState(initial.trim());

  useEffect(() => {
    const timer = setTimeout(() => {
      setSettled(text.trim());
    }, SETTLE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [text]);

  const ready = settled.length >= MIN_LENGTH;
  const suggestions = useQuery({
    ...suggestQuery(queryString({ q: settled, limit: 8 })),
    enabled: ready,
  });
  const options = ready ? (suggestions.data ?? []) : [];

  return (
    <Autocomplete<ProductListItemView, false, false, true>
      freeSolo
      options={options}
      filterOptions={(list) => list}
      inputValue={text}
      onInputChange={(_, value) => {
        setText(value);
      }}
      onChange={(_, value) => {
        if (value === null) return;
        if (typeof value === 'string') onSubmit(value.trim());
        else onPick(value);
      }}
      getOptionLabel={(option) =>
        typeof option === 'string' ? option : `${option.brand.name} ${option.name}`
      }
      getOptionKey={(option) => (typeof option === 'string' ? option : option.id)}
      loading={ready && suggestions.isFetching}
      loadingText={t('common.loading')}
      noOptionsText={t('market.search.none')}
      renderOption={({ key, ...props }, option) => (
        <Box component="li" key={key} {...props} sx={{ gap: 1.5, minHeight: 48 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              flexShrink: 0,
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: 'var(--ink-100)',
            }}
          >
            {option.image !== null && (
              <Box
                component="img"
                src={catalogImageVariant(option.image.url, 240)}
                width={40}
                height={40}
                alt=""
                loading="lazy"
                sx={{ display: 'block', width: 40, height: 40, objectFit: 'contain' }}
              />
            )}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {option.brand.name}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {option.name}
            </Typography>
          </Box>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          type="search"
          label={t('market.search.label')}
          placeholder={t('market.search.placeholder')}
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps.input,
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} aria-hidden />
                </InputAdornment>
              ),
            },
          }}
        />
      )}
    />
  );
}
