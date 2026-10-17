import type { CityView, CountryView } from '@kttf/shared/types';

/** Страна по умолчанию — продукт делается для Казахстана. */
export const HOME_COUNTRY_CODE = 'KZ';

/** Казахстан, если он в списке; иначе первая страна по порядку справочника. */
export function defaultCountry(countries: readonly CountryView[]): CountryView | undefined {
  return countries.find((country) => country.code === HOME_COUNTRY_CODE) ?? countries[0];
}

/**
 * Города по странам — для списка с подзаголовками.
 *
 * Порядок стран и городов внутри — тот, что задал сервер. Город страны,
 * которой нет в списке, не теряется: он уходит в последнюю группу без
 * подзаголовка.
 */
export function citiesByCountry(
  countries: readonly CountryView[],
  cities: readonly CityView[],
): readonly { readonly country: CountryView | undefined; readonly cities: readonly CityView[] }[] {
  const known = new Set(countries.map((country) => country.id));
  const groups = countries
    .map((country) => ({
      country,
      cities: cities.filter((city) => city.countryId === country.id),
    }))
    .filter((group) => group.cities.length > 0);
  const rest = cities.filter((city) => !known.has(city.countryId));

  return rest.length === 0 ? groups : [...groups, { country: undefined, cities: rest }];
}
