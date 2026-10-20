import { describe, expect, it } from 'vitest';

import type { MessageKey } from '@/common/i18n';
import { ru } from '@/common/i18n/ru';
import {
  CLUB_EVENING,
  CLUB_REF,
  COACH,
  COACH_REF,
  KIDS_GROUP,
  VENUE_TRAINING,
  VISIT_TRAINING,
} from '@/test/coach-fixtures';

import { placeText } from './labels';
import {
  clubTrainingRowsOf,
  coachTrainingRowsOf,
  emptyClubTrainingRow,
  emptyCoachTrainingRow,
  toClubTrainingInputs,
  toCoachTrainingInputs,
} from './training-rows';
import { trainingsSearchSchema, toTrainingsQuery } from './trainings-search';

const t = (key: MessageKey): string => ru[key];

describe('тренировки тренера — в PUT /coaches/:id/trainings', () => {
  it('в форме только свои: клубные ведёт клуб', () => {
    const rows = coachTrainingRowsOf(COACH.trainings);

    expect(rows.map((row) => row.id)).toEqual([
      KIDS_GROUP.id,
      VISIT_TRAINING.id,
      VENUE_TRAINING.id,
    ]);
  });

  it('id строки уходит обратно — связь с клубом сохраняется', () => {
    const body = toCoachTrainingInputs(coachTrainingRowsOf(COACH.trainings));

    expect(body?.map((training) => training.id)).toEqual([
      KIDS_GROUP.id,
      VISIT_TRAINING.id,
      VENUE_TRAINING.id,
    ]);
  });

  it('«в клубе» — клуб KTTF: только clubId, без зала', () => {
    const [club] = toCoachTrainingInputs(coachTrainingRowsOf([KIDS_GROUP])) ?? [];

    expect(club).toMatchObject({
      place: 'CLUB',
      clubId: CLUB_REF.id,
      venueName: null,
      venueAddress: null,
      kidsFromAge: 6,
      priceKzt: 20000,
      unit: 'MONTH',
    });
  });

  it('«в клубе» — другой зал: название и адрес, без клуба', () => {
    const [venue] = toCoachTrainingInputs(coachTrainingRowsOf([VENUE_TRAINING])) ?? [];

    expect(venue).toMatchObject({
      place: 'CLUB',
      clubId: null,
      venueName: 'Спортзал школы №5',
      venueAddress: 'Сатпаева 3',
    });
  });

  it('у выезда места нет, даже если в форме остался клуб', () => {
    const [row] = coachTrainingRowsOf([KIDS_GROUP]);
    if (row === undefined) throw new Error('нет строки');

    expect(toCoachTrainingInputs([{ ...row, place: 'VISIT' }])?.[0]).toMatchObject({
      place: 'VISIT',
      clubId: null,
      venueName: null,
      venueAddress: null,
    });
  });

  it('«в клубе» без клуба или зал без адреса — ошибка формы', () => {
    const row = { ...emptyCoachTrainingRow(), title: 'Группа', audiences: ['KIDS'] as const };

    expect(toCoachTrainingInputs([row])).toBeNull();
    expect(
      toCoachTrainingInputs([{ ...row, mode: 'venue', venueName: 'Зал', venueAddress: '' }]),
    ).toBeNull();
    expect(
      toCoachTrainingInputs([{ ...row, mode: 'venue', venueName: 'Зал', venueAddress: 'Абая 1' }]),
    ).not.toBeNull();
  });

  it('новая строка уходит без id, цена без пробелов, без цены — «по договорённости»', () => {
    const row = {
      ...emptyCoachTrainingRow(),
      place: 'ONLINE' as const,
      title: 'Разбор видео',
      audiences: ['AMATEURS'] as const,
    };

    expect(toCoachTrainingInputs([{ ...row, price: '8 000', unit: 'HOUR' }])?.[0]).toEqual({
      kind: 'GROUP',
      audiences: ['AMATEURS'],
      kidsFromAge: null,
      title: 'Разбор видео',
      schedule: null,
      priceKzt: 8000,
      unit: 'HOUR',
      note: null,
      place: 'ONLINE',
      clubId: null,
      venueName: null,
      venueAddress: null,
    });
    expect(toCoachTrainingInputs([row])?.[0]).toMatchObject({ priceKzt: null, unit: 'NONE' });
  });

  it('возраст ребёнка уходит только у детской аудитории', () => {
    const [row] = coachTrainingRowsOf([KIDS_GROUP]);
    if (row === undefined) throw new Error('нет строки');

    expect(
      toCoachTrainingInputs([{ ...row, audiences: ['AMATEURS'], kidsFromAge: '6' }])?.[0],
    ).toMatchObject({ kidsFromAge: null });
  });
});

describe('тренировки клуба — в PUT /clubs/:id/trainings', () => {
  it('тренер — его id, id строки сохраняется', () => {
    expect(toClubTrainingInputs(clubTrainingRowsOf([CLUB_EVENING]))).toEqual([
      {
        id: CLUB_EVENING.id,
        kind: 'GROUP',
        audiences: ['AMATEURS'],
        kidsFromAge: null,
        title: 'Вечерняя группа',
        schedule: 'вт, чт 19:00',
        priceKzt: 15000,
        unit: 'MONTH',
        note: null,
        coachId: COACH_REF.id,
      },
    ]);
  });

  it('без тренера — тренировка клуба', () => {
    const row = { ...emptyClubTrainingRow(), title: 'Группа', audiences: ['KIDS'] as const };

    expect(toClubTrainingInputs([row])?.[0]).toMatchObject({ coachId: null });
  });
});

describe('место строкой и клуб в адресе', () => {
  it('клуб — названием и адресом, зал — с адресом, иначе вид места', () => {
    expect(placeText(KIDS_GROUP, t)).toBe(`${CLUB_REF.name} · Абая 10`);
    expect(placeText(VENUE_TRAINING, t)).toBe('Спортзал школы №5 · Сатпаева 3');
    expect(placeText(VISIT_TRAINING, t)).toBe('Выезд');
  });

  it('clubId из ссылки доходит до запроса; кривой — отбрасывается', () => {
    expect(toTrainingsQuery(trainingsSearchSchema.parse({ clubId: CLUB_REF.id }), 1)).toEqual({
      page: 1,
      limit: 20,
      clubId: CLUB_REF.id,
    });
    expect(trainingsSearchSchema.parse({ clubId: 'abc' }).clubId).toBeUndefined();
  });
});
