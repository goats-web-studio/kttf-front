import type {
  CityView,
  CountryView,
  CreateCityInput,
  CreateCountryInput,
  CreateRegionInput,
  ListCitiesQuery,
  ListRegionsQuery,
  RegionView,
  UpdateCityInput,
  UpdateCountryInput,
  UpdateRegionInput,
} from '@kttf/shared/types';

import { apiRequest, queryString } from '@/common/api';

/**
 * Справочник стран, областей и городов — ADR-046, ADR-096.
 *
 * Открытые списки отдают только доступное: страна не скрыта, город не скрыт.
 * Полные списки и правка — у администратора платформы; права проверяет
 * сервер (ТС 8.3), отказ — `FORBIDDEN`.
 */

export function listCountries(): Promise<readonly CountryView[]> {
  return apiRequest<readonly CountryView[]>('/countries');
}

export function listCities(query: ListCitiesQuery = {}): Promise<readonly CityView[]> {
  return apiRequest<readonly CityView[]>(`/cities${queryString(query)}`);
}

/** Области — ADR-096. Открытый список — только доступные, по порядку справочника. */
export function listRegions(query: ListRegionsQuery = {}): Promise<readonly RegionView[]> {
  return apiRequest<readonly RegionView[]>(`/regions${queryString(query)}`);
}

export function listAdminCountries(): Promise<readonly CountryView[]> {
  return apiRequest<readonly CountryView[]>('/admin/countries');
}

export function listAdminCities(query: ListCitiesQuery = {}): Promise<readonly CityView[]> {
  return apiRequest<readonly CityView[]>(`/admin/cities${queryString(query)}`);
}

export function listAdminRegions(query: ListRegionsQuery = {}): Promise<readonly RegionView[]> {
  return apiRequest<readonly RegionView[]>(`/admin/regions${queryString(query)}`);
}

export function createCountry(input: CreateCountryInput): Promise<CountryView> {
  return apiRequest<CountryView>('/admin/countries', { method: 'POST', body: input });
}

/** Удаления нет: запись скрывается `isActive: false`. */
export function updateCountry(id: string, input: UpdateCountryInput): Promise<CountryView> {
  return apiRequest<CountryView>(`/admin/countries/${id}`, { method: 'PATCH', body: input });
}

export function createCity(input: CreateCityInput): Promise<CityView> {
  return apiRequest<CityView>('/admin/cities', { method: 'POST', body: input });
}

export function updateCity(id: string, input: UpdateCityInput): Promise<CityView> {
  return apiRequest<CityView>(`/admin/cities/${id}`, { method: 'PATCH', body: input });
}

export function createRegion(input: CreateRegionInput): Promise<RegionView> {
  return apiRequest<RegionView>('/admin/regions', { method: 'POST', body: input });
}

/** Удаления нет, как у города: область скрывается `isActive: false`. */
export function updateRegion(id: string, input: UpdateRegionInput): Promise<RegionView> {
  return apiRequest<RegionView>(`/admin/regions/${id}`, { method: 'PATCH', body: input });
}
