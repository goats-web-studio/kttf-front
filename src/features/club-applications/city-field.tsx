import type { CityView } from '@kttf/shared/types';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode, Ref } from 'react';

import { useT, type MessageKey } from '@/common/i18n';
import { usePlaceName } from '@/features/places/place-name';
import { citiesQuery, regionsQuery } from '@/features/places/queries';
import { renderRegionGroup } from '@/features/places/region-group';
import { groupedByRegion } from '@/features/places/regions';

interface ApplicationCityFieldProps {
  /** Город строкой — выбранный из справочника или вписанный. */
  readonly value: string;
  /** Город справочника; `undefined` — вписан руками. */
  readonly cityId: string | undefined;
  readonly onChange: (city: string, cityId: string | undefined) => void;
  readonly onBlur: () => void;
  readonly inputRef: Ref<HTMLInputElement>;
  readonly label: string;
  readonly error: MessageKey | undefined;
}

/** Поиск по обоим названиям — как в выборе города. */
const filter = createFilterOptions<CityView>({
  stringify: (city) => `${city.name} ${city.nameKk ?? ''}`,
});

/**
 * Город заявки клуба — ADR-047, ADR-096.
 *
 * Выбирается из справочника — тогда заявка несёт и `cityId`, и клуб по ней
 * заводится без повторного выбора. Города в справочнике нет — его вписывают
 * руками: заявки приходят и оттуда, где клубов KTTF ещё нет. Правка текста
 * после выбора — уже вписанный город, ссылка снимается.
 */
export default function ApplicationCityField({
  value,
  cityId,
  onChange,
  onBlur,
  inputRef,
  label,
  error,
}: ApplicationCityFieldProps): ReactNode {
  const t = useT();
  const placeName = usePlaceName();
  const regions = useQuery(regionsQuery);
  const cities = useQuery(citiesQuery);

  const grouped = groupedByRegion(regions.data ?? [], cities.data ?? [], placeName);
  const selected = grouped.cities.find((city) => city.id === cityId) ?? null;

  return (
    <Autocomplete<CityView, false, false, true>
      freeSolo
      options={grouped.cities}
      value={selected}
      inputValue={value}
      onChange={(_, next) => {
        if (next === null) onChange('', undefined);
        else if (typeof next === 'string') onChange(next, undefined);
        else onChange(placeName(next), next.id);
      }}
      onInputChange={(_, next, reason) => {
        // Выбор из списка сам подставляет название — это не правка.
        if (reason === 'reset') return;
        onChange(next, undefined);
      }}
      onBlur={onBlur}
      getOptionLabel={(option) => (typeof option === 'string' ? option : placeName(option))}
      isOptionEqualToValue={(option, chosen) =>
        typeof chosen !== 'string' && option.id === chosen.id
      }
      filterOptions={filter}
      groupBy={grouped.groupOf}
      renderGroup={renderRegionGroup}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required
          name="city"
          inputRef={inputRef}
          error={error !== undefined}
          {...(error === undefined
            ? {}
            : {
                helperText: t(error),
                slotProps: { ...params.slotProps, formHelperText: { role: 'alert' } },
              })}
        />
      )}
    />
  );
}
