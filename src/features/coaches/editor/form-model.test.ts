import { describe, expect, it } from 'vitest';

import { COACH } from '@/test/coach-fixtures';

import {
  PAGE_FIELDS,
  QUALIFICATION_FIELDS,
  coachFieldsOf,
  coachPatch,
  credentialRowsOf,
  moveRow,
  parseInteger,
  toAchievementInputs,
  toCredentialInputs,
} from './form-model';

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
