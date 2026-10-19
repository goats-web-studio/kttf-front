import type { CityRef } from '@kttf/shared/types';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

import { useCityLabel } from './city-label';
import { citiesByCountry } from './countries';
import { usePlaceName } from './place-name';
import { citiesQuery, countriesQuery } from './queries';

interface CitiesFilterProps {
  /** Выбранные города; пустой список — фильтра нет. */
  readonly value: readonly string[];
  readonly onChange: (cityIds: string[]) => void;
  readonly label: string;
}

/** Поиск по обоим названиям — как в `CityPicker`. */
const filter = createFilterOptions<CityRef>({
  stringify: (city) => `${city.name} ${city.nameKk ?? ''}`,
});

/**
 * Несколько городов справочника — ADR-054, как «регион / город» с плюсом у
 * RTTF.
 *
 * Выбранные — чипами в поле, поиск по названию внутри списка. Стран больше
 * одной — города группами под названием страны. Город из адреса, которого
 * нет в открытом справочнике, остаётся выбранным и подписан словом.
 */
export default function CitiesFilter({ value, onChange, label }: CitiesFilterProps): ReactNode {
  const t = useT();
  const placeName = usePlaceName();
  const cityLabel = useCityLabel();
  const countries = useQuery(countriesQuery);
  const cities = useQuery(citiesQuery);

  const groups = citiesByCountry(countries.data ?? [], cities.data ?? []);
  const countryOf = new Map<string, string>();
  for (const group of groups) {
    for (const city of group.cities) {
      countryOf.set(city.id, group.country === undefined ? '' : placeName(group.country));
    }
  }
  const options: CityRef[] = groups.flatMap((group) => group.cities);
  const selected = value.map(
    (id) => options.find((city) => city.id === id) ?? { id, name: cityLabel(id), nameKk: null },
  );

  return (
    <Autocomplete
      multiple
      options={options}
      value={selected}
      onChange={(_, chosen) => {
        onChange(chosen.map((city) => city.id));
      }}
      getOptionLabel={placeName}
      isOptionEqualToValue={(option, chosen) => option.id === chosen.id}
      filterOptions={filter}
      {...(groups.length > 1 ? { groupBy: (city: CityRef) => countryOf.get(city.id) ?? '' } : {})}
      limitTags={2}
      loading={cities.isPending}
      loadingText={t('common.loading')}
      noOptionsText={t('places.city.none')}
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  );
}
