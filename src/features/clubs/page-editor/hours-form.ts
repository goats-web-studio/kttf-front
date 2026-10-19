import {
  CLUB_CLOSES_MAX_MIN,
  setClubHoursSchema,
  type ClubHoursInterval,
} from '@kttf/shared/types';

import { formatMinutes, parseMinutes } from '../club-time';

/** Интервал в форме — строками, как их видит и правит человек: «08:00». */
export interface HoursRow {
  readonly opens: string;
  readonly closes: string;
}

/** Неделя в форме: индекс 0 — понедельник. */
export type HoursWeek = readonly (readonly HoursRow[])[];

const DAY_MIN = 24 * 60;

export function toHoursWeek(hours: readonly ClubHoursInterval[]): HoursWeek {
  return [1, 2, 3, 4, 5, 6, 7].map((weekday) =>
    hours
      .filter((interval) => interval.weekday === weekday)
      .sort((a, b) => a.opensMin - b.opensMin)
      .map((interval) => ({
        opens: formatMinutes(interval.opensMin),
        closes: formatMinutes(interval.closesMin),
      })),
  );
}

/**
 * Неделя из формы — в интервалы для сервера. `null` — в форме ошибка.
 *
 * Закрытие раньше открытия читается как ночь: «20:00 — 02:00» значит до двух
 * часов следующего дня, и человек не обязан знать, что это 26:00.
 * «24:00» и «00:00» в закрытии — конец дня.
 */
export function fromHoursWeek(week: HoursWeek): ClubHoursInterval[] | null {
  const intervals: ClubHoursInterval[] = [];

  for (const [index, day] of week.entries()) {
    for (const row of day) {
      const opensMin = parseMinutes(row.opens);
      const closesRaw = parseMinutes(row.closes);

      if (opensMin === null || closesRaw === null || opensMin >= DAY_MIN) return null;

      const closesMin = closesRaw <= opensMin ? closesRaw + DAY_MIN : closesRaw;

      if (closesMin > CLUB_CLOSES_MAX_MIN) return null;

      intervals.push({ weekday: index + 1, opensMin, closesMin });
    }
  }

  return setClubHoursSchema.safeParse({ hours: intervals }).success ? intervals : null;
}
