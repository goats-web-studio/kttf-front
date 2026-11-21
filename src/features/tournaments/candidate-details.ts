import type { PlayerListItemView } from '@kttf/shared/types';

import { formatRating } from '@/common/i18n';

/**
 * Строка о найденном игроке в составе турнира — год, клуб, город, рейтинг.
 *
 * Однофамильцев в клубе хватает, и по одному городу организатор путал
 * людей (замечание владельца после пилота, 21.11.2026). Год и клуб
 * различают их без перехода на профиль; анкета без рейтинга называется
 * словами, а не числом умолчания.
 */
export function candidateDetails(
  player: PlayerListItemView,
  parts: { readonly club: string | null; readonly city: string; readonly unrated: string },
): string {
  return [
    String(player.birthYear),
    parts.club,
    parts.city,
    player.confirmed ? formatRating(player.rating) : parts.unrated,
  ]
    .filter((part): part is string => part !== null && part !== '')
    .join(' · ');
}
