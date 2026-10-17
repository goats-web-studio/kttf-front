import type { CityRef } from '@kttf/shared/types';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode, type Ref } from 'react';

import { useT, type MessageKey } from '@/common/i18n';

import { defaultCountry } from './countries';
import { usePlaceName } from './place-name';
import { citiesQuery, countriesQuery } from './queries';

interface CityPickerProps {
  /** Выбранный город; пустая строка — не выбран. */
  readonly value: string;
  readonly onChange: (cityId: string) => void;
  readonly onBlur?: () => void;
  readonly inputRef?: Ref<HTMLInputElement>;
  readonly name?: string;
  readonly label: ReactNode;
  /**
   * Город, уже указанный у клуба или игрока, — из ответа API.
   *
   * Скрытого города в открытом справочнике нет, но у того, кому он указан,
   * он остаётся (ADR-046): форма правки показывает его выбранным, а не
   * пустым полем, которое придётся заполнить заново.
   */
  readonly current?: CityRef | undefined;
  readonly error?: MessageKey | undefined;
}

/**
 * Поиск в выпадающем списке — по обоим названиям: в казахском интерфейсе
 * человек может набрать город по-русски, и наоборот.
 */
const filter = createFilterOptions<CityRef>({
  stringify: (city) => `${city.name} ${city.nameKk ?? ''}`,
});

/**
 * Выбор города из справочника — ADR-046.
 *
 * Город выбирается, а не набирается: свободная строка разводила «Алматы»
 * и «алматы » по фильтрам как два разных города. Поиск внутри списка
 * нужен, потому что городов десятки.
 *
 * Страна выбирается, только когда их больше одной; по умолчанию —
 * Казахстан. Пока страна одна, лишнего поля в форме нет.
 *
 * Два поля без обёртки: в сетке формы они встают двумя ячейками.
 */
export default function CityPicker({
  value,
  onChange,
  onBlur,
  inputRef,
  name,
  label,
  current,
  error,
}: CityPickerProps): ReactNode {
  const t = useT();
  const placeName = usePlaceName();
  const countries = useQuery(countriesQuery);
  const cities = useQuery(citiesQuery);
  const [chosenCountry, setChosenCountry] = useState<string | undefined>(undefined);

  const all = cities.data ?? [];
  const countryList = countries.data ?? [];
  const pickCountry = countryList.length > 1;
  const countryId =
    chosenCountry ??
    all.find((city) => city.id === value)?.countryId ??
    defaultCountry(countryList)?.id;

  const offered: readonly CityRef[] = pickCountry
    ? all.filter((city) => city.countryId === countryId)
    : all;
  // Указанный город, которого нет среди предложенных, — скрытый либо ещё не
  // пришедший справочник. Без него в списке поле показалось бы пустым.
  const kept = current?.id === value && !offered.some((city) => city.id === value);
  const options = kept ? [current, ...offered] : offered;
  const selected = options.find((city) => city.id === value) ?? null;
  const isHidden = kept && cities.isSuccess && !all.some((city) => city.id === value);

  const helper: MessageKey | undefined = error ?? (isHidden ? 'places.city.hidden' : undefined);

  return (
    <>
      {pickCountry && (
        <TextField
          select
          label={t('places.country')}
          value={countryId ?? ''}
          onChange={(event) => {
            const next = event.target.value;

            setChosenCountry(next);
            // Город другой страны в новой стране не выбран.
            if (!all.some((city) => city.id === value && city.countryId === next)) {
              onChange('');
            }
          }}
        >
          {countryList.map((country) => (
            <MenuItem key={country.id} value={country.id}>
              {placeName(country)}
            </MenuItem>
          ))}
        </TextField>
      )}

      <Autocomplete
        options={options}
        value={selected}
        onChange={(_, city) => {
          onChange(city?.id ?? '');
        }}
        onBlur={onBlur}
        getOptionLabel={placeName}
        isOptionEqualToValue={(option, chosen) => option.id === chosen.id}
        filterOptions={filter}
        loading={cities.isPending}
        loadingText={t('common.loading')}
        noOptionsText={t('places.city.none')}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            {...(name === undefined ? {} : { name })}
            {...(inputRef === undefined ? {} : { inputRef })}
            error={error !== undefined}
            {...(helper === undefined
              ? {}
              : {
                  helperText: t(helper),
                  slotProps: {
                    ...params.slotProps,
                    ...(error === undefined ? {} : { formHelperText: { role: 'alert' } }),
                  },
                })}
          />
        )}
      />
    </>
  );
}
