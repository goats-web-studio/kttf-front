import { queryString } from '@/common/api';

/** Сколько товаров в «Выборе игроков» — `docs/10` 5.2. */
const CHOICE = 12;

export const CHOICE_PICKS = ['BLADE', 'RUBBER'] as const;
export type ChoicePick = (typeof CHOICE_PICKS)[number];

/** Планка рейтинга — «чем играют 400+». Границы включительно, как у сервера. */
export const CHOICE_BANDS = ['all', 'low', 'mid', 'high'] as const;
export type ChoiceBand = (typeof CHOICE_BANDS)[number];

const BAND_RANGE: Readonly<Record<ChoiceBand, { from?: number; to?: number }>> = {
  all: {},
  low: { to: 300 },
  mid: { from: 300, to: 400 },
  high: { from: 400 },
};

/** Строка запроса «Выбора игроков»: порядок по игрокам и планка рейтинга. */
export function choiceQuery(pick: ChoicePick, band: ChoiceBand): string {
  const range = BAND_RANGE[band];

  return queryString({
    category: pick,
    sort: 'players',
    playerRatingFrom: range.from,
    playerRatingTo: range.to,
    page: 1,
    limit: CHOICE,
  });
}
