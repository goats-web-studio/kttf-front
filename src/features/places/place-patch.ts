import type {
  CityView,
  CountryView,
  CreateCityInput,
  CreateCountryInput,
  UpdateCityInput,
  UpdateCountryInput,
} from '@kttf/shared/types';

/** Поля города в форме: страна у города не меняется (ADR-046). */
export type CityFormValues = Omit<CreateCityInput, 'countryId'>;

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

export function cityPatch(city: CityView, values: CityFormValues): UpdateCityInput | null {
  const patch: UpdateCityInput = {};

  if (values.name !== city.name) patch.name = values.name;
  if ((values.nameKk ?? null) !== city.nameKk) patch.nameKk = values.nameKk ?? null;
  if (values.sortOrder !== undefined && values.sortOrder !== city.sortOrder) {
    patch.sortOrder = values.sortOrder;
  }

  return Object.keys(patch).length === 0 ? null : patch;
}
