import { DEFAULT_PAGE_SIZE, type ListPlayersRequest } from '@kttf/shared/types';
import { z } from 'zod';

import { searchId, searchPage, searchText } from '@/common/search';

/**
 * Города через запятую — ADR-054.
 *
 * Строкой, а не массивом: массив роутер пишет в адрес JSON-ом
 * (`?city=%5B%22…`), а ссылку на рейтинг двух городов пересылают в чат.
 * Кривой идентификатор выпадает один, остальные города остаются.
 */
const searchIds = z
  .preprocess(
    (value) =>
      typeof value === 'string'
        ? value
            .split(',')
            .map((part) => part.trim())
            .filter((part) => z.uuid().safeParse(part).success)
            .join(',')
        : value,
    z.string().min(1),
  )
  .optional()
  .catch(undefined);

/** Граница рейтинга — целое, как рейтинг читается на экране (ADR-053). */
const searchRating = z.coerce.number().int().min(0).max(9999).optional().catch(undefined);

/**
 * Фильтры страницы «Игроки» в адресе — ADR-054, docs/07 6.2.
 *
 * Общие для `/players` и старого `/ratings`: старая ссылка из чата
 * переадресуется с теми же условиями.
 */
export const playersSearchSchema = z.object({
  search: searchText,
  city: searchIds,
  club: searchId,
  from: searchRating,
  to: searchRating,
  gender: z.enum(['MALE', 'FEMALE']).optional().catch(undefined),
  hand: z.enum(['RIGHT', 'LEFT']).optional().catch(undefined),
  /** Сильнейшие первыми — умолчание, в адрес не пишется. */
  order: z.literal('asc').optional().catch(undefined),
  page: searchPage,
});

export type PlayersSearch = z.infer<typeof playersSearchSchema>;

export function parsePlayersSearch(search: Record<string, unknown>): PlayersSearch {
  return playersSearchSchema.parse(search);
}

/** Города из адреса списком. */
export function citiesOf(search: PlayersSearch): readonly string[] {
  return search.city === undefined ? [] : search.city.split(',');
}

export function toPlayersQuery(search: PlayersSearch): ListPlayersRequest {
  return {
    page: search.page ?? 1,
    limit: DEFAULT_PAGE_SIZE,
    ...(search.search === undefined ? {} : { search: search.search }),
    ...(search.city === undefined ? {} : { cityId: citiesOf(search) }),
    ...(search.club === undefined ? {} : { clubId: search.club }),
    ...(search.from === undefined ? {} : { ratingFrom: search.from }),
    ...(search.to === undefined ? {} : { ratingTo: search.to }),
    ...(search.gender === undefined ? {} : { gender: search.gender }),
    ...(search.hand === undefined ? {} : { playingHand: search.hand }),
    ...(search.order === undefined ? {} : { order: search.order }),
  };
}
