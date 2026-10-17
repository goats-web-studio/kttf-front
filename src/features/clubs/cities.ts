import type { CityRef, ClubView } from '@kttf/shared/types';

import type { Locale } from '@/common/i18n';
import { placeName } from '@/features/places/place-name';

/**
 * Города, в которых есть клубы, — для чипов города на главной.
 *
 * Город сравнивается по записи справочника, а не по названию (ADR-046):
 * подпись зависит от языка, а запись одна.
 */
export function clubCities(clubs: Iterable<ClubView>, locale: Locale): readonly CityRef[] {
  const cities = new Map<string, CityRef>();

  for (const club of clubs) {
    cities.set(club.city.id, club.city);
  }

  return [...cities.values()].sort((a, b) =>
    placeName(a, locale).localeCompare(placeName(b, locale), locale),
  );
}
