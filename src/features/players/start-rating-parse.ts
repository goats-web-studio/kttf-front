import { START_RATING_MAX, START_RATING_MIN } from '@kttf/shared/types';

/** До сотых, точка или запятая: «384», «384.1», «384,15». */
const RATING_TEXT = /^\d{1,4}(?:[.,]\d{1,2})?$/;

/** Текст поля — в рейтинг, или `null`, если так рейтинг не пишут. */
export function parseStartRating(text: string): number | null {
  const trimmed = text.trim();
  if (!RATING_TEXT.test(trimmed)) return null;

  const value = Number(trimmed.replace(',', '.'));

  return value >= START_RATING_MIN && value <= START_RATING_MAX ? value : null;
}
