import { queryOptions } from '@tanstack/react-query';

import { listAdminCities, listAdminCountries, listCities, listCountries } from './api';

export const placeKeys = {
  all: ['places'] as const,
  countries: ['places', 'countries'] as const,
  cities: ['places', 'cities'] as const,
  adminCountries: ['places', 'admin', 'countries'] as const,
  adminCities: (countryId: string) => ['places', 'admin', 'cities', countryId] as const,
};

/**
 * Справочник меняется редко — заводом нового города раз в месяцы. Держится
 * полчаса: формы и фильтры на каждой странице читают его из кэша.
 */
const LONG = 30 * 60_000;

export const countriesQuery = queryOptions({
  queryKey: placeKeys.countries,
  queryFn: () => listCountries(),
  staleTime: LONG,
});

/**
 * Все доступные города одним запросом, без деления по странам.
 *
 * Городов — десятки, и один список обслуживает сразу выбор в форме, фильтры
 * и подписи чипов. Порядок задаёт сервер: `sortOrder`, затем название.
 */
export const citiesQuery = queryOptions({
  queryKey: placeKeys.cities,
  queryFn: () => listCities(),
  staleTime: LONG,
});

/** Полные списки для администратора — со скрытыми записями. */
export const adminCountriesQuery = queryOptions({
  queryKey: placeKeys.adminCountries,
  queryFn: () => listAdminCountries(),
});

export function adminCitiesQuery(countryId: string) {
  return queryOptions({
    queryKey: placeKeys.adminCities(countryId),
    queryFn: () => listAdminCities({ countryId }),
  });
}
