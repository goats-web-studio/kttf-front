import { describe, expect, it } from 'vitest';

import { tournamentFormSchema } from './tournament-form-schema';

const NOW = new Date('2026-11-14T15:00:00.000Z');
const now = (): Date => NOW;

const VALID = {
  clubId: '00000000-0000-4000-8000-000000000001',
  name: 'Пятничный турнир',
  startsAt: '2026-11-20T14:00:00.000Z',
  entryFee: 0,
  level: 'CLUB',
  tableCount: 4,
  formatConfig: { type: 'ROUND_ROBIN', rounds: 1, setsToWin: 3 },
} as const;

/** Ошибки по полям: путь → сообщение. */
function errorsOf(isNew: boolean, value: Record<string, unknown>): Record<string, string> {
  const result = tournamentFormSchema(isNew, now).safeParse({ ...VALID, ...value });
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]));
}

describe('tournamentFormSchema — проверки у полей формы турнира', () => {
  it('правильный турнир проходит', () => {
    expect(errorsOf(true, {})).toEqual({});
  });

  it('запись позже начала — ошибка у «Запись до», а не у формы целиком', () => {
    // Ровно случай владельца 14.11: начало 14.11 00:00, запись до 15.11 06:30.
    const errors = errorsOf(false, {
      startsAt: '2026-11-21T19:00:00.000Z',
      registrationEndsAt: '2026-11-22T01:30:00.000Z',
    });

    expect(errors.registrationEndsAt).toBe('regAfterStart');
  });

  it('у нового турнира начало и запись в прошлом отвергаются', () => {
    const errors = errorsOf(true, {
      startsAt: '2026-11-13T19:00:00.000Z',
      registrationEndsAt: '2026-11-13T18:00:00.000Z',
    });

    expect(errors.startsAt).toBe('startsPast');
    expect(errors.registrationEndsAt).toBe('regPast');
  });

  it('у заведённого раньше турнира прошлое не мешает сохранить правку', () => {
    expect(errorsOf(false, { startsAt: '2026-11-13T19:00:00.000Z' }).startsAt).toBeUndefined();
  });

  it('вывернутые границы рейтинга и годов — у верхнего поля пары', () => {
    const errors = errorsOf(true, {
      ratingCapMin: 400,
      ratingCapMax: 300,
      birthYearFrom: 2010,
      birthYearTo: 2000,
    });

    expect(errors.ratingCapMax).toBe('ratingBounds');
    expect(errors.birthYearTo).toBe('birthBounds');
  });

  it('лимит участников — хотя бы двое', () => {
    expect(errorsOf(true, { maxParticipants: 1 }).maxParticipants).toBe('maxParticipants');
    expect(errorsOf(true, { maxParticipants: 2 }).maxParticipants).toBeUndefined();
  });
});
