import { describe, expect, it } from 'vitest';

import {
  hasFilters,
  hiddenFilterCount,
  toCoachesQuery,
  toTrainingsQuery,
  toggleIn,
  trainingsSearchSchema,
} from './trainings-search';

const CITY = '00000000-0000-4000-8000-0000000000c1';

describe('фильтры «Тренировок» в адресе', () => {
  it('строки по ссылке и числа, набранные руками, читаются одинаково', () => {
    // RouterLink кладёт «9» строкой, адрес, набранный руками, роутер читает числом.
    expect(trainingsSearchSchema.parse({ age: '9', priceTo: '20000' })).toMatchObject({
      age: 9,
      priceTo: 20000,
    });
    expect(trainingsSearchSchema.parse({ age: 9, priceTo: 20000 })).toMatchObject({
      age: 9,
      priceTo: 20000,
    });
  });

  it('кривой элемент списка выпадает один, повтор схлопывается', () => {
    const search = trainingsSearchSchema.parse({
      kind: 'GROUP,NOPE,KIDS_GROUP,GROUP',
      audience: 'KIDS',
      place: 'ONLINE,somewhere',
      city: `${CITY},abc`,
    });

    expect(search.kind).toBe('GROUP,KIDS_GROUP');
    expect(search.place).toBe('ONLINE');
    expect(search.city).toBe(CITY);
  });

  it('кривое значение не роняет страницу, а снимает фильтр', () => {
    const search = trainingsSearchSchema.parse({
      view: 'everything',
      kind: 'NOPE',
      age: 42,
      priceTo: -5,
      language: 'DE',
      page: 0,
    });

    expect(search).toEqual({});
  });

  it('вид «Тренеры» — единственное значение вида в адресе', () => {
    expect(trainingsSearchSchema.parse({ view: 'coaches' }).view).toBe('coaches');
    expect(trainingsSearchSchema.parse({ view: 'trainings' }).view).toBeUndefined();
  });
});

describe('запрос к серверу', () => {
  it('тренировки: списки — массивами, город — cityId', () => {
    const search = trainingsSearchSchema.parse({
      kind: 'KIDS_GROUP',
      audience: 'KIDS,TEENS',
      age: '9',
      city: CITY,
      priceTo: 20000,
      language: 'KK',
      q: 'Иванов',
    });

    expect(toTrainingsQuery(search, 2)).toEqual({
      page: 2,
      limit: 20,
      kind: ['KIDS_GROUP'],
      audience: ['KIDS', 'TEENS'],
      age: 9,
      cityId: [CITY],
      priceTo: 20000,
      language: 'KK',
    });
  });

  it('тренеры: только город, язык и имя', () => {
    const search = trainingsSearchSchema.parse({
      view: 'coaches',
      kind: 'GROUP',
      city: CITY,
      q: 'Иванов',
    });

    expect(toCoachesQuery(search, 1)).toEqual({
      page: 1,
      limit: 20,
      cityId: [CITY],
      search: 'Иванов',
    });
  });

  it('без фильтров — только страница', () => {
    expect(toTrainingsQuery({}, 1)).toEqual({ page: 1, limit: 20 });
  });
});

describe('«Фильтры (N)» на телефоне', () => {
  const search = trainingsSearchSchema.parse({
    kind: 'GROUP,SPLIT',
    age: 9,
    city: CITY,
    language: 'RU',
    q: 'Иванов',
  });

  it('каждое условие — по одному, как чипы под панелью', () => {
    expect(hiddenFilterCount(search, 'trainings')).toBe(5);
  });

  it('у тренеров считаются только их фильтры, имя — в открытом поле', () => {
    expect(hiddenFilterCount(search, 'coaches')).toBe(2);
    expect(hasFilters({ q: 'Иванов' }, 'coaches')).toBe(true);
    expect(hasFilters({ q: 'Иванов' }, 'trainings')).toBe(false);
  });

  it('переключение значения в списке', () => {
    expect(toggleIn(['GROUP'], 'SPLIT')).toEqual(['GROUP', 'SPLIT']);
    expect(toggleIn(['GROUP', 'SPLIT'], 'GROUP')).toEqual(['SPLIT']);
  });
});

describe('расписание в фильтрах — день, время, набор (T3)', () => {
  it('дни и время из адреса: строкой по ссылке и числом, набранным руками', () => {
    expect(
      trainingsSearchSchema.parse({ day: '1,3', time: 'EVENING', open: 'true' }),
    ).toMatchObject({ day: '1,3', time: 'EVENING', open: true });
    // Один день роутер читает числом, «true» — булевым.
    expect(trainingsSearchSchema.parse({ day: 6, open: true })).toMatchObject({
      day: '6',
      open: true,
    });
  });

  it('кривое выпадает: день 8, неизвестное время, open не true', () => {
    const search = trainingsSearchSchema.parse({ day: '8,2,x', time: 'NIGHT', open: 'yes' });

    expect(search.day).toBe('2');
    expect(search.time).toBeUndefined();
    expect(search.open).toBeUndefined();
  });

  it('в запрос — числами дни по порядку, время списком, open только когда включён', () => {
    const search = trainingsSearchSchema.parse({ day: '5,1', time: 'MORNING,DAY', open: 'true' });

    expect(toTrainingsQuery(search, 1)).toMatchObject({
      day: [1, 5],
      time: ['MORNING', 'DAY'],
      open: true,
    });
    expect(toTrainingsQuery(trainingsSearchSchema.parse({}), 1)).not.toHaveProperty('open');
    expect(hiddenFilterCount(search, 'trainings')).toBe(5);
  });
});
