import { queryOptions } from '@tanstack/react-query';

import {
  listAdminCities,
  listAdminCountries,
  listAdminRegions,
  listCities,
  listCountries,
  listRegions,
} from './api';

export const placeKeys = {
  all: ['places'] as const,
  countries: ['places', 'countries'] as const,
  regions: ['places', 'regions'] as const,
  cities: ['places', 'cities'] as const,
  adminCountries: ['places', 'admin', 'countries'] as const,
  adminRegions: (countryId: string) => ['places', 'admin', 'regions', countryId] as const,
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
 * Все доступные области одним запросом — ADR-096. Как и города: их
 * десятки, и один список обслуживает фильтры, группы в выборе города
 * и подписи чипов.
 */
export const regionsQuery = queryOptions({
  queryKey: placeKeys.regions,
  queryFn: () => listRegions(),
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

export function adminRegionsQuery(countryId: string) {
  return queryOptions({
    queryKey: placeKeys.adminRegions(countryId),
    queryFn: () => listAdminRegions({ countryId }),
  });
}

export function adminCitiesQuery(countryId: string) {
  return queryOptions({
    queryKey: placeKeys.adminCities(countryId),
    queryFn: () => listAdminCities({ countryId }),
  });
}
