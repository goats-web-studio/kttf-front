import { nextSession } from '@kttf/shared/types';
import { describe, expect, it } from 'vitest';

import { ru } from '@/common/i18n/ru';

import {
  fullScheduleText,
  nextSessionText,
  scheduleLinesOf,
  scheduleOf,
  scheduleText,
  type ScheduleLine,
} from './schedule';

const t = (key: keyof typeof ru): string => ru[key];

const line = (weekdays: number[], start: string, end: string): ScheduleLine => ({
  key: `${weekdays.join('')}-${start}`,
  weekdays,
  start,
  end,
});

/** «пн, ср 18:00–19:30» и «сб 11:00–12:30» слотами. */
const SLOTS = [
  { weekday: 1, startMin: 1080, endMin: 1170 },
  { weekday: 3, startMin: 1080, endMin: 1170 },
  { weekday: 6, startMin: 660, endMin: 750 },
];

describe('строки расписания и слоты', () => {
  it('строка с несколькими днями уходит слотами по одному на день', () => {
    const result = scheduleOf([line([3, 1], '18:00', '19:30'), line([6], '11:00', '12:30')]);

    expect(result.valid).toBe(true);
    expect(result.slots).toEqual(SLOTS);
  });

  it('слоты собираются обратно в те же строки', () => {
    const lines = scheduleLinesOf(SLOTS);

    expect(lines.map(({ weekdays, start, end }) => ({ weekdays, start, end }))).toEqual([
      { weekdays: [1, 3], start: '18:00', end: '19:30' },
      { weekdays: [6], start: '11:00', end: '12:30' },
    ]);
    expect(scheduleOf(lines).slots).toEqual(SLOTS);
  });

  it('пустая строка ничего не значит и не ошибка', () => {
    const result = scheduleOf([line([], '', ''), line([2], '09:00', '10:00')]);

    expect(result.errors).toEqual([null, null]);
    expect(result.slots).toEqual([{ weekday: 2, startMin: 540, endMin: 600 }]);
  });

  it('ошибка — у своей строки: без дней, кривое время, конец раньше начала', () => {
    const result = scheduleOf([
      line([], '18:00', '19:00'),
      line([1], '18', '19:00'),
      line([2], '19:00', '18:00'),
    ]);

    expect(result.errors).toEqual(['days', 'time', 'order']);
    expect(result.valid).toBe(false);
    expect(result.slots).toEqual([]);
  });

  it('пересечение в один день помечает обе строки; встык — можно', () => {
    expect(
      scheduleOf([line([1, 3], '18:00', '19:30'), line([3], '19:00', '20:00')]).errors,
    ).toEqual(['overlap', 'overlap']);
    expect(
      scheduleOf([line([1, 3], '18:00', '19:30'), line([3], '19:30', '20:30')]).errors,
    ).toEqual([null, null]);
    // Разные дни — то же время не пересекается.
    expect(scheduleOf([line([1], '18:00', '19:30'), line([2], '18:00', '19:30')]).valid).toBe(true);
  });

  it('больше 14 занятий в неделю — ошибка у строки, где предел перейдён', () => {
    const week = [1, 2, 3, 4, 5, 6, 7];
    const result = scheduleOf([
      line(week, '07:00', '08:00'),
      line(week, '18:00', '19:00'),
      line([1], '20:00', '21:00'),
    ]);

    expect(result.errors).toEqual([null, null, 'many']);
  });
});

describe('расписание на карточке', () => {
  it('дни с одинаковым временем вместе, примечание — после', () => {
    expect(scheduleText(SLOTS, 'ru')).toBe('пн, ср 18:00–19:30 · сб 11:00–12:30');
    expect(fullScheduleText({ slots: SLOTS, schedule: 'кроме праздников' }, 'ru')).toBe(
      'пн, ср 18:00–19:30 · сб 11:00–12:30 · кроме праздников',
    );
  });

  it('без слотов — строкой, как раньше; без ничего — нет строки', () => {
    expect(fullScheduleText({ slots: [], schedule: 'по договорённости' }, 'ru')).toBe(
      'по договорённости',
    );
    expect(fullScheduleText({ slots: [], schedule: null }, 'ru')).toBeNull();
  });
});

describe('«Ближайшее» по UTC+5', () => {
  const text = (slots: typeof SLOTS, now: string): string | null => {
    const next = nextSession(slots, new Date(now));

    return next === null ? null : nextSessionText(next, t, 'ru');
  };

  it('сегодня, завтра, в другой день недели', () => {
    // 17:00 в Алматы: понедельник 19, вторник 20, четверг 22 октября 2026.
    expect(text(SLOTS, '2026-10-19T12:00:00.000Z')).toBe('Ближайшее: сегодня в 18:00');
    expect(text(SLOTS, '2026-10-20T12:00:00.000Z')).toBe('Ближайшее: завтра в 18:00');
    expect(text(SLOTS, '2026-10-22T12:00:00.000Z')).toBe('Ближайшее: в сб в 11:00');
  });

  it('начавшееся сегодня уже не ближайшее — через неделю', () => {
    // Понедельник, 18:30 в Алматы: занятие 18:00 уже идёт.
    expect(text([{ weekday: 1, startMin: 1080, endMin: 1170 }], '2026-10-19T13:30:00.000Z')).toBe(
      'Ближайшее: в пн в 18:00',
    );
  });

  it('без слотов — ничего', () => {
    expect(text([], '2026-10-19T12:00:00.000Z')).toBeNull();
  });
});
