import type { ClubView } from '@kttf/shared/types';

/**
 * Города, в которых есть клубы, — для выбора города в фильтре.
 *
 * Выбранный город остаётся в списке, даже если клубов в нём больше нет:
 * иначе ссылка с `?city=` открылась бы с фильтром, которого не видно в поле.
 */
export function clubCities(clubs: Iterable<ClubView>, selected?: string): readonly string[] {
  const cities = new Set<string>();

  for (const club of clubs) {
    cities.add(club.city);
  }
  if (selected !== undefined) {
    cities.add(selected);
  }

  return [...cities].sort((a, b) => a.localeCompare(b, 'ru'));
}
