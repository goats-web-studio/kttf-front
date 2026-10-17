import type {
  CityView,
  CountryView,
  CreateCityInput,
  CreateCountryInput,
  ListCitiesQuery,
  UpdateCityInput,
  UpdateCountryInput,
} from '@kttf/shared/types';

import { apiRequest, queryString } from '@/common/api';

/**
 * Справочник стран и городов — ADR-046.
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

export function listAdminCountries(): Promise<readonly CountryView[]> {
  return apiRequest<readonly CountryView[]>('/admin/countries');
}

export function listAdminCities(query: ListCitiesQuery = {}): Promise<readonly CityView[]> {
  return apiRequest<readonly CityView[]>(`/admin/cities${queryString(query)}`);
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
