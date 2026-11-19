import type {
  CityView,
  CountryView,
  CreateCityInput,
  CreateCountryInput,
  CreateRegionInput,
  RegionView,
  UpdateCityInput,
  UpdateCountryInput,
  UpdateRegionInput,
} from '@kttf/shared/types';

/** Поля города в форме: страна у города не меняется (ADR-046). */
export type CityFormValues = Omit<CreateCityInput, 'countryId'>;

/** Поля области в форме: страна у области не меняется (ADR-096). */
export type RegionFormValues = Omit<CreateRegionInput, 'countryId'>;

/**
 * Правка записи справочника — только изменённые поля.
 *
 * Пустая правка сервером отвергается, поэтому «сохранить» без изменений
 * отдаёт `null` и до сервера не доходит. Стёртое казахское название уходит
 * `null`; порядок не стирается — пустое поле его не трогает.
 */
export function countryPatch(
  country: CountryView,
  values: CreateCountryInput,
): UpdateCountryInput | null {
  const patch: UpdateCountryInput = {};

  if (values.code !== country.code) patch.code = values.code;
  if (values.name !== country.name) patch.name = values.name;
  if ((values.nameKk ?? null) !== country.nameKk) patch.nameKk = values.nameKk ?? null;
  if (values.sortOrder !== undefined && values.sortOrder !== country.sortOrder) {
    patch.sortOrder = values.sortOrder;
  }

  return Object.keys(patch).length === 0 ? null : patch;
}

export function regionPatch(
  region: RegionView,
  values: RegionFormValues,
): UpdateRegionInput | null {
  const patch: UpdateRegionInput = {};

  if (values.name !== region.name) patch.name = values.name;
  if ((values.nameKk ?? null) !== region.nameKk) patch.nameKk = values.nameKk ?? null;
  if (values.sortOrder !== undefined && values.sortOrder !== region.sortOrder) {
    patch.sortOrder = values.sortOrder;
  }

  return Object.keys(patch).length === 0 ? null : patch;
}

export function cityPatch(city: CityView, values: CityFormValues): UpdateCityInput | null {
  const patch: UpdateCityInput = {};

  if (values.name !== city.name) patch.name = values.name;
  if ((values.nameKk ?? null) !== city.nameKk) patch.nameKk = values.nameKk ?? null;
  if (values.sortOrder !== undefined && values.sortOrder !== city.sortOrder) {
    patch.sortOrder = values.sortOrder;
  }

  // Координаты — ADR-093: пустое поле стирает, город уходит из автоопределения.
  // Только если поле было в форме: старые вызовы без координат их не стирают.
  if ('lat' in values && (values.lat ?? null) !== (city.lat ?? null)) {
    patch.lat = values.lat ?? null;
  }
  if ('lng' in values && (values.lng ?? null) !== (city.lng ?? null)) {
    patch.lng = values.lng ?? null;
  }

  // Область — ADR-096: пустой выбор выводит город из области.
  if ('regionId' in values && (values.regionId ?? null) !== city.regionId) {
    patch.regionId = values.regionId ?? null;
  }

  return Object.keys(patch).length === 0 ? null : patch;
}
