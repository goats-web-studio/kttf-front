import { describe, expect, it } from 'vitest';

import { COACH } from '@/test/coach-fixtures';

import {
  PAGE_FIELDS,
  QUALIFICATION_FIELDS,
  coachFieldsOf,
  coachPatch,
  credentialRowsOf,
  emptyServiceRow,
  moveRow,
  parseInteger,
  serviceRowsOf,
  toAchievementInputs,
  toCredentialInputs,
  toServiceInputs,
} from './form-model';

/** Тело строки без идентификатора — так её отправляет форма. */
function withoutId(row: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'id'));
}

describe('поля страницы — в PATCH', () => {
  it('без правок — ничего не отправляется', () => {
    expect(coachPatch(COACH, coachFieldsOf(COACH), PAGE_FIELDS)).toEqual({ kind: 'unchanged' });
  });

  it('уходят только изменённые поля своей вкладки; пустое — null', () => {
    const form = {
      ...coachFieldsOf(COACH),
      headline: '  Тренер взрослых  ',
      visitAreas: '',
      // Квалификация правится другой вкладкой и сюда не попадает.
      education: 'Другое',
    };

    expect(coachPatch(COACH, form, PAGE_FIELDS)).toEqual({
      kind: 'patch',
      patch: { headline: 'Тренер взрослых', visitAreas: null },
    });
  });

  it('Telegram — именем без собаки и ссылки, год — числом', () => {
    const form = {
      ...coachFieldsOf(COACH),
      telegram: 'https://t.me/new_coach',
      coachingSince: '2010',
    };

    expect(coachPatch(COACH, form, PAGE_FIELDS)).toEqual({
      kind: 'patch',
      patch: { telegram: 'new_coach', coachingSince: 2010 },
    });
  });

  it('кривой год называет поле, а не уходит на сервер', () => {
    const form = { ...coachFieldsOf(COACH), coachingSince: '20x5' };

    expect(coachPatch(COACH, form, PAGE_FIELDS)).toEqual({
      kind: 'invalid',
      fields: ['coachingSince'],
    });
  });

  it('квалификация: снятый разряд — null', () => {
    const form = { ...coachFieldsOf(COACH), sportsRank: '' as const };

    expect(coachPatch(COACH, form, QUALIFICATION_FIELDS)).toEqual({
      kind: 'patch',
      patch: { sportsRank: null },
    });
  });
});

describe('тренировки — в PUT', () => {
  it('строки страницы возвращаются тем же телом', () => {
    expect(toServiceInputs(serviceRowsOf(COACH))).toEqual(COACH.services.map(withoutId));
  });

  it('цена с пробелами разрядов — числом; без цены — «по договорённости»', () => {
    const [row] = serviceRowsOf(COACH);
    if (row === undefined) throw new Error('нет строки');

    expect(toServiceInputs([{ ...row, price: '25 000' }])?.[0]).toMatchObject({
      priceKzt: 25000,
      unit: 'MONTH',
    });
    expect(toServiceInputs([{ ...row, price: '' }])?.[0]).toMatchObject({
      priceKzt: null,
      unit: 'NONE',
    });
  });

  it('возраст ребёнка уходит только у тренировки для детей или подростков', () => {
    const [row] = serviceRowsOf(COACH);
    if (row === undefined) throw new Error('нет строки');

    expect(
      toServiceInputs([{ ...row, audiences: ['AMATEURS'], kidsFromAge: '6' }])?.[0],
    ).toMatchObject({ kidsFromAge: null });
    expect(
      toServiceInputs([{ ...row, audiences: ['TEENS'], kidsFromAge: '12' }])?.[0],
    ).toMatchObject({ kidsFromAge: 12 });
  });

  it('без названия или аудитории — ошибка формы', () => {
    expect(toServiceInputs([emptyServiceRow()])).toBeNull();
    expect(toServiceInputs([{ ...emptyServiceRow(), title: 'Группа' }])).toBeNull();
    expect(
      toServiceInputs([{ ...emptyServiceRow(), title: 'Группа', audiences: ['KIDS'] }]),
    ).not.toBeNull();
  });

  it('кривая цена — ошибка формы', () => {
    const [row] = serviceRowsOf(COACH);
    if (row === undefined) throw new Error('нет строки');

    expect(toServiceInputs([{ ...row, price: '20к' }])).toBeNull();
  });
});

describe('документы и заслуги — в PUT', () => {
  it('сохранённый документ уходит со своим id — отметка «проверено» остаётся', () => {
    expect(toCredentialInputs(credentialRowsOf(COACH))).toEqual([
      {
        id: COACH.credentials[0]?.id,
        kind: 'DIPLOMA',
        title: 'Диплом тренера-преподавателя',
        issuer: 'КазАСТ',
        year: 2014,
        file: null,
        filePublic: false,
      },
    ]);
  });

  it('«показывать скан» без скана не отправляется', () => {
    const [row] = credentialRowsOf(COACH);
    if (row === undefined) throw new Error('нет строки');

    expect(toCredentialInputs([{ ...row, filePublic: true }])?.[0]?.filePublic).toBe(false);

    const file = '/api/v1/files/coach-docs/00000000-0000-4000-8000-000000000123.webp';
    expect(toCredentialInputs([{ ...row, file, filePublic: true }])?.[0]).toMatchObject({
      file,
      filePublic: true,
    });
  });

  it('заслуга без текста — ошибка формы, год — числом', () => {
    expect(
      toAchievementInputs([{ key: 'a', role: 'AS_COACH', year: '2020', title: ' ' }]),
    ).toBeNull();
    expect(
      toAchievementInputs([
        { key: 'a', role: 'AS_COACH', year: '2020', title: 'Ученик — призёр U15' },
      ]),
    ).toEqual([{ role: 'AS_COACH', year: 2020, title: 'Ученик — призёр U15' }]);
  });
});

describe('мелочи формы', () => {
  it('целое из строки', () => {
    expect(parseInteger('')).toBeNull();
    expect(parseInteger(' 20 000 ')).toBe(20000);
    expect(parseInteger('1.5')).toBeNaN();
  });

  it('перестановка строк не выходит за края', () => {
    expect(moveRow(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    expect(moveRow(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b']);
    expect(moveRow(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
  });
});
