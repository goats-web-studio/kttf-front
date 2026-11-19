import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

import { useCityLabel } from './city-label';
import { citiesByCountry } from './countries';
import { usePlaceName } from './place-name';
import { citiesQuery, countriesQuery, regionsQuery } from './queries';
import { scopeOptions, type ScopeOption } from './regions';
import ScopeOptionLabel from './scope-option';

interface CitiesFilterProps {
  /** Выбранные города и области; пустой список — фильтра нет. */
  readonly value: readonly string[];
  readonly onChange: (cityIds: string[]) => void;
  readonly label: string;
}

/** Пункт фильтра с подписью страны — для групп, когда стран больше одной. */
type CountryOption = ScopeOption & { readonly country: string };

/** Поиск по обоим названиям — как в `CityPicker`. */
const filter = createFilterOptions<CountryOption>({
  stringify: (option) => `${option.name} ${option.nameKk ?? ''}`,
});

/**
 * Несколько городов справочника — ADR-054, как «регион / город» с плюсом у
 * RTTF.
 *
 * Выбрать можно и область целиком (ADR-096): в списке она стоит строкой
 * над своими городами, в запросе раскрывается в них (`useCityScope`).
 * Выбранные — чипами в поле, поиск по названию внутри списка. Стран больше
 * одной — группами под названием страны. Город из адреса, которого нет
 * в открытом справочнике, остаётся выбранным и подписан словом.
 */
export default function CitiesFilter({ value, onChange, label }: CitiesFilterProps): ReactNode {
  const t = useT();
  const placeName = usePlaceName();
  const cityLabel = useCityLabel();
  const countries = useQuery(countriesQuery);
  const regions = useQuery(regionsQuery);
  const cities = useQuery(citiesQuery);

  const groups = citiesByCountry(countries.data ?? [], cities.data ?? []);
  const options: CountryOption[] = groups.flatMap((group) =>
    scopeOptions(regions.data ?? [], group.cities).map((option) => ({
      ...option,
      country: group.country === undefined ? '' : placeName(group.country),
    })),
  );
  const selected = value.map(
    (id): CountryOption =>
      options.find((option) => option.id === id) ?? {
        id,
        name: cityLabel(id),
        nameKk: null,
        kind: 'city',
        nested: false,
        country: '',
      },
  );

  return (
    <Autocomplete
      multiple
      options={options}
      value={selected}
      onChange={(_, chosen) => {
        onChange(chosen.map((option) => option.id));
      }}
      getOptionLabel={placeName}
      isOptionEqualToValue={(option, chosen) => option.id === chosen.id}
      filterOptions={filter}
      {...(groups.length > 1 ? { groupBy: (option: CountryOption) => option.country } : {})}
      renderOption={({ key, ...props }, option) => (
        <li key={key} {...props}>
          {/* Отступ — на подписи: отступ пункта задают стили списка. */}
          <Box component="span" sx={{ pl: option.nested ? 2 : 0, minWidth: 0 }}>
            <ScopeOptionLabel option={option} />
          </Box>
        </li>
      )}
      limitTags={2}
      loading={cities.isPending}
      loadingText={t('common.loading')}
      noOptionsText={t('places.city.none')}
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  );
}
