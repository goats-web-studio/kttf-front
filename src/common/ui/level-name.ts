import type { RatingLevel } from '@kttf/shared/rating';

/** Название уровня — ключ словаря. */
export const LEVEL_NAME = {
  1: 'level.name.1',
  2: 'level.name.2',
  3: 'level.name.3',
  4: 'level.name.4',
  5: 'level.name.5',
  6: 'level.name.6',
  7: 'level.name.7',
  8: 'level.name.8',
  9: 'level.name.9',
  10: 'level.name.10',
} as const satisfies Record<RatingLevel, string>;
