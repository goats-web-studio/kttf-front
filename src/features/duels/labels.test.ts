import { AppError, ERROR_CODES } from '@kttf/shared/errors';
import type { DuelItemView } from '@kttf/shared/types';
import { describe, expect, it } from 'vitest';

import { fill, type MessageKey } from '@/common/i18n';
import { ru } from '@/common/i18n/ru';

import { byTodo, duelErrorText, duelTodo } from './labels';
import { parseTime, slotProblem, toSlotInput } from './slot-draft';

const t = (key: MessageKey): string => ru[key];

const ME = '00000000-0000-4000-8000-000000000101';
const OTHER = '00000000-0000-4000-8000-000000000102';

const player = (id: string) => ({
  id,
  name: 'Игрок Тест',
  photoUrl: null,
  rating: '500.00',
  isProvisional: false,
  city: { id: '00000000-0000-4000-8000-0000000000c1', name: 'Алматы', nameKk: null },
});

function item(patch: Partial<DuelItemView>): DuelItemView {
  return {
    id: '00000000-0000-4000-8000-0000000000d1',
    kind: 'DUEL',
    rated: true,
    bestOf: 5,
    status: 'OPEN',
    author: player(ME),
    opponent: null,
    venue: { club: null, venueName: 'Зал', venueAddress: 'ул. 1', city: player(ME).city },
    slots: [],
    startsAt: null,
    endsAt: null,
    note: null,
    responsesNew: 0,
    result: null,
    createdAt: '2026-10-24T08:00:00.000Z',
    ...patch,
  };
}

describe('вариант времени', () => {
  const now = new Date(2026, 9, 24, 12, 0);

  it('часы — «19:00», «19.00», «1900»; чужое — нет', () => {
    expect(parseTime('19:00')).toEqual({ hours: 19, minutes: 0 });
    expect(parseTime('9.30')).toEqual({ hours: 9, minutes: 30 });
    expect(parseTime('1900')).toEqual({ hours: 19, minutes: 0 });
    expect(parseTime('25:00')).toBeNull();
    expect(parseTime('вечером')).toBeNull();
  });

  it('местное время уходит ISO-моментом', () => {
    expect(toSlotInput({ day: '2026-10-25', from: '19:00', to: '21:00' })).toEqual({
      startsAt: new Date(2026, 9, 25, 19, 0).toISOString(),
      endsAt: new Date(2026, 9, 25, 21, 0).toISOString(),
    });
  });

  it('правила сервера — у поля: пусто, длина, прошлое, дальше 60 дней', () => {
    expect(slotProblem({ day: '', from: '19:00', to: '21:00' }, now)).toBe(
      'duel.slot.error.incomplete',
    );
    expect(slotProblem({ day: '2026-10-25', from: 'семь', to: '21:00' }, now)).toBe(
      'duel.slot.error.time',
    );
    expect(slotProblem({ day: '2026-10-25', from: '19:00', to: '19:20' }, now)).toBe(
      'duel.slot.error.length',
    );
    expect(slotProblem({ day: '2026-10-25', from: '10:00', to: '17:00' }, now)).toBe(
      'duel.slot.error.length',
    );
    expect(slotProblem({ day: '2026-10-24', from: '10:00', to: '11:00' }, now)).toBe(
      'duel.slot.error.past',
    );
    expect(slotProblem({ day: '2027-01-10', from: '10:00', to: '11:00' }, now)).toBe(
      'duel.slot.error.far',
    );
    expect(slotProblem({ day: '2026-10-25', from: '19:00', to: '21:00' }, now)).toBeNull();
  });
});

describe('что ждёт моего шага', () => {
  const now = new Date('2026-10-24T12:00:00.000Z');

  it('вызов мне, новые отклики, подтвердить и внести счёт', () => {
    expect(
      duelTodo(item({ status: 'CHALLENGE', author: player(OTHER), opponent: player(ME) }), ME, now),
    ).toBe('duel.todo.answer');
    expect(duelTodo(item({ responsesNew: 2 }), ME, now)).toBe('duel.todo.responses');
    expect(duelTodo(item({ responsesNew: 0 }), ME, now)).toBeNull();
    const reported = {
      winnerId: ME,
      winnerSets: 3,
      loserSets: 0,
      reportedById: OTHER,
      reportedAt: '2026-10-23T12:00:00.000Z',
      confirmBy: '2026-10-25T12:00:00.000Z',
      confirmedAt: null,
      disputeComment: null,
      resolutionComment: null,
    };
    expect(
      duelTodo(item({ status: 'REPORTED', opponent: player(OTHER), result: reported }), ME, now),
    ).toBe('duel.todo.confirm');
    // Свой внесённый счёт подтверждает второй.
    expect(
      duelTodo(
        item({
          status: 'REPORTED',
          opponent: player(OTHER),
          result: { ...reported, reportedById: ME },
        }),
        ME,
        now,
      ),
    ).toBeNull();
    expect(
      duelTodo(
        item({
          status: 'SCHEDULED',
          opponent: player(OTHER),
          startsAt: '2026-10-24T10:00:00.000Z',
        }),
        ME,
        now,
      ),
    ).toBe('duel.todo.report');
  });

  it('требующие действия — первыми, остальной порядок сохранён', () => {
    const quiet = item({ id: '00000000-0000-4000-8000-0000000000a1' });
    const busy = item({ id: '00000000-0000-4000-8000-0000000000a2', responsesNew: 1 });
    const other = item({ id: '00000000-0000-4000-8000-0000000000a3' });

    expect(byTodo([quiet, busy, other], ME, now).map((duel) => duel.id)).toEqual([
      busy.id,
      quiet.id,
      other.id,
    ]);
  });
});

describe('текст отказа', () => {
  it('пределы и частота называют, что исчерпано', () => {
    expect(
      duelErrorText(new AppError(ERROR_CODES.DUEL_LIMIT, 'x', { kind: 'OPEN', limit: 3 }), t),
    ).toBe(fill(ru['duel.error.limit.OPEN'], { limit: '3' }));
    expect(
      duelErrorText(
        new AppError(ERROR_CODES.DUEL_RATING_LIMIT, 'x', { kind: 'PLAYER', playerId: ME }),
        t,
        ME,
      ),
    ).toBe(ru['duel.error.rating.PLAYER_SELF']);
    expect(
      duelErrorText(
        new AppError(ERROR_CODES.DUEL_RATING_LIMIT, 'x', { kind: 'PLAYER', playerId: OTHER }),
        t,
        ME,
      ),
    ).toBe(ru['duel.error.rating.PLAYER']);
    expect(
      duelErrorText(new AppError(ERROR_CODES.DUEL_OPPONENT_INVALID, 'x', { reason: 'SELF' }), t),
    ).toBe(ru['duel.error.opponent.SELF']);
  });

  it('без подробностей — общий текст кода', () => {
    expect(duelErrorText(new AppError(ERROR_CODES.DUEL_LIMIT, 'x'), t)).toBe(
      ru['error.api.DUEL_LIMIT'],
    );
    expect(duelErrorText(new AppError(ERROR_CODES.DUEL_TIME_INVALID, 'x'), t)).toBe(
      ru['error.api.DUEL_TIME_INVALID'],
    );
  });
});
