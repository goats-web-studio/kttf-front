import ListSubheader from '@mui/material/ListSubheader';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import { orUndefined } from '@/common/search';

import { useCityLabel } from './city-label';
import { citiesByCountry } from './countries';
import { usePlaceName } from './place-name';
import { citiesQuery, countriesQuery, regionsQuery } from './queries';
import { scopeOptions } from './regions';
import ScopeOptionLabel from './scope-option';

interface CityFilterProps {
  /** Город или область из адреса; `undefined` — фильтра нет. */
  readonly value: string | undefined;
  readonly onChange: (cityId: string | undefined) => void;
}

/**
 * Фильтр списка по городу справочника — ADR-046, ADR-096.
 *
 * Выбирается, а не набирается. Выбрать можно и область целиком: она
 * раскрывается в свои города в запросе (`useCityScope`). Применяется
 * сразу при выборе (ADR-040). Стран больше одной — города идут группами
 * под названием страны.
 *
 * Город из адреса, которого нет в открытом справочнике, остаётся в списке
 * выбранным: иначе фильтр действовал бы, а поле показывало «Любое».
 */
export default function CityFilter({ value, onChange }: CityFilterProps): ReactNode {
  const t = useT();
  const placeName = usePlaceName();
  const cityLabel = useCityLabel();
  const countries = useQuery(countriesQuery);
  const regions = useQuery(regionsQuery);
  const cities = useQuery(citiesQuery);

  const groups = citiesByCountry(countries.data ?? [], cities.data ?? []);
  const known =
    cities.data?.some((city) => city.id === value) === true ||
    regions.data?.some((region) => region.id === value) === true;

  // Пункты и подзаголовки — плоским списком: меню MUI ждёт их прямыми
  // детьми, пункт внутри фрагмента не выбирается.
  const items: ReactNode[] = [
    <MenuItem key="any" value="">
      {t('filter.any')}
    </MenuItem>,
  ];

  if (value !== undefined && !known) {
    items.push(
      <MenuItem key={value} value={value}>
        {cityLabel(value)}
      </MenuItem>,
    );
  }

  for (const group of groups) {
    if (groups.length > 1 && group.country !== undefined) {
      items.push(
        <ListSubheader key={`country-${group.country.id}`}>
          {placeName(group.country)}
        </ListSubheader>,
      );
    }
    for (const option of scopeOptions(regions.data ?? [], group.cities)) {
      items.push(
        <MenuItem key={option.id} value={option.id} sx={option.nested ? { pl: 4 } : undefined}>
          <ScopeOptionLabel option={option} />
        </MenuItem>,
      );
    }
  }

  return (
    <TextField
      select
      label={t('filter.city')}
      value={value ?? ''}
      onChange={(event) => {
        onChange(orUndefined(event.target.value));
      }}
      // В поле — только название: подсказка «все города» нужна в списке.
      slotProps={{ select: { renderValue: (selected) => cityLabel(String(selected)) } }}
    >
      {items}
    </TextField>
  );
}
