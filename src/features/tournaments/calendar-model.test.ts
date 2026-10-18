import { describe, expect, it } from 'vitest';

import {
  byDay,
  dayKeyOf,
  groupByDate,
  monthGrid,
  monthRange,
  parseMonth,
  shiftMonth,
  startOfToday,
} from './calendar-model';

/** Момент по местным часам — так их видит человек и так считает модель. */
const local = (y: number, m: number, d: number, h = 0, min = 0) =>
  new Date(y, m - 1, d, h, min).toISOString();

describe('сетка месяца', () => {
  it('октябрь 2026: с понедельника, хвосты соседних месяцев, ровные недели', () => {
    const weeks = monthGrid('2026-10');

    // 1 октября 2026 — четверг: впереди три дня сентября.
    expect(weeks[0]?.map((day) => day.key)).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    // 31 октября — суббота: неделя добита воскресеньем 1 ноября.
    expect(weeks.at(-1)?.at(-1)).toEqual({ key: '2026-11-01', day: 1, inMonth: false });
    expect(weeks.flat().filter((day) => day.inMonth)).toHaveLength(31);
  });

  it('месяц с понедельника не тянет хвост предыдущего', () => {
    // 1 июня 2026 — понедельник.
    expect(monthGrid('2026-06')[0]?.[0]).toEqual({ key: '2026-06-01', day: 1, inMonth: true });
  });

  it('февраль невисокосного года с понедельника — ровно четыре недели', () => {
    // 1 февраля 2027 — понедельник, 28 — воскресенье.
    expect(monthGrid('2027-02')).toHaveLength(4);
  });
});

describe('месяцы', () => {
  it('сдвиг через границу года', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });

  it('из адреса — только настоящий месяц', () => {
    expect(parseMonth('2026-10')).toBe('2026-10');
    expect(parseMonth('2026-13')).toBeUndefined();
    expect(parseMonth('октябрь')).toBeUndefined();
  });

  it('границы месяца — по местным часам, весь последний день', () => {
    const { from, to } = monthRange('2026-10');

    expect(dayKeyOf(from)).toBe('2026-10-01');
    expect([from.getHours(), from.getMinutes()]).toEqual([0, 0]);
    expect(dayKeyOf(to)).toBe('2026-10-31');
    expect([to.getHours(), to.getMinutes()]).toEqual([23, 59]);
  });
});

describe('турниры по дням', () => {
  it('поздний вечер остаётся в своём дне, внутри дня — по времени', () => {
    const days = byDay([
      { id: 'b', startsAt: local(2026, 10, 19, 23, 30) },
      { id: 'a', startsAt: local(2026, 10, 19, 19, 20) },
      { id: 'c', startsAt: local(2026, 10, 20, 0, 10) },
    ]);

    expect(days.get('2026-10-19')?.map((item) => item.id)).toEqual(['a', 'b']);
    expect(days.get('2026-10-20')?.map((item) => item.id)).toEqual(['c']);
  });

  it('группы списка — в порядке ответа: прошедшие остаются от свежих', () => {
    const groups = groupByDate([
      { startsAt: local(2026, 10, 18, 13) },
      { startsAt: local(2026, 10, 18, 9, 30) },
      { startsAt: local(2026, 10, 17, 18, 20) },
    ]);

    expect(groups.map(([key, items]) => [key, items.length])).toEqual([
      ['2026-10-18', 2],
      ['2026-10-17', 1],
    ]);
  });

  it('граница «Ближайшие / Прошедшие» — начало сегодняшнего дня', () => {
    const today = startOfToday(new Date(2026, 9, 19, 3, 36));

    expect(dayKeyOf(today)).toBe('2026-10-19');
    expect([today.getHours(), today.getMinutes()]).toEqual([0, 0]);
  });
});
