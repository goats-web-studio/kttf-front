import { describe, expect, it } from 'vitest';

import { fromHoursWeek, toHoursWeek, type HoursWeek } from './hours-form';

const week = (monday: HoursWeek[number], rest: HoursWeek[number] = []): HoursWeek => [
  monday,
  rest,
  rest,
  rest,
  rest,
  rest,
  rest,
];

describe('часы в форме', () => {
  it('туда и обратно без потерь, включая ночной интервал', () => {
    const hours = [
      { weekday: 1, opensMin: 480, closesMin: 1380 },
      { weekday: 5, opensMin: 1200, closesMin: 1560 },
    ];
    const form = toHoursWeek(hours);

    expect(form[0]).toEqual([{ opens: '08:00', closes: '23:00' }]);
    expect(form[4]).toEqual([{ opens: '20:00', closes: '02:00' }]);
    expect(fromHoursWeek(form)).toEqual(hours);
  });

  it('закрытие раньше открытия — ночь, полночь — конец дня', () => {
    expect(fromHoursWeek(week([{ opens: '20:00', closes: '02:00' }]))).toEqual([
      { weekday: 1, opensMin: 1200, closesMin: 1560 },
    ]);
    expect(fromHoursWeek(week([{ opens: '10:00', closes: '00:00' }]))).toEqual([
      { weekday: 1, opensMin: 600, closesMin: 1440 },
    ]);
  });

  it('кривое время, ночь дольше шести утра и пересечение — ошибка', () => {
    expect(fromHoursWeek(week([{ opens: '8', closes: '23:00' }]))).toBeNull();
    expect(fromHoursWeek(week([{ opens: '24:00', closes: '02:00' }]))).toBeNull();
    expect(fromHoursWeek(week([{ opens: '20:00', closes: '07:00' }]))).toBeNull();
    expect(
      fromHoursWeek(
        week([
          { opens: '08:00', closes: '14:00' },
          { opens: '13:00', closes: '20:00' },
        ]),
      ),
    ).toBeNull();
  });

  it('пустая неделя — «часы не указаны»', () => {
    expect(fromHoursWeek(week([]))).toEqual([]);
  });
});
