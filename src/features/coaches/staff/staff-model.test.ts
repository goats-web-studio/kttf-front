import { describe, expect, it } from 'vitest';

import { COACH } from '@/test/coach-fixtures';
import { PLAYERS } from '@/test/fixtures';

import { hasStudents, sinceYear, staffActions, studentState, tenureYears } from './staff-model';

describe('кнопки штаба по clubCoachAwaits', () => {
  it('запрос тренера: клуб принимает или отклоняет, тренер может только отозвать', () => {
    expect(staffActions('REQUESTED_BY_COACH', 'CLUB')).toEqual(['confirm', 'decline']);
    expect(staffActions('REQUESTED_BY_COACH', 'COACH')).toEqual(['revoke']);
  });

  it('приглашение клуба: тренер принимает или отклоняет, клуб может только отозвать', () => {
    expect(staffActions('INVITED_BY_CLUB', 'COACH')).toEqual(['confirm', 'decline']);
    expect(staffActions('INVITED_BY_CLUB', 'CLUB')).toEqual(['revoke']);
  });

  it('в штабе — разорвать может любая сторона', () => {
    expect(staffActions('ACTIVE', 'CLUB')).toEqual(['leave']);
    expect(staffActions('ACTIVE', 'COACH')).toEqual(['leave']);
  });
});

describe('«Я ученик» в трёх состояниях', () => {
  const other = { playerId: PLAYERS.second.id };

  it('не вошёл, без профиля или сам тренер — кнопки нет', () => {
    expect(studentState(null, COACH, undefined)).toBe('hidden');
    expect(studentState({ playerId: null }, COACH, undefined)).toBe('hidden');
    expect(studentState({ playerId: COACH.player.id }, COACH, { coachPlayerId: null })).toBe(
      'hidden',
    );
  });

  it('тренер уже в анкете — «Вы ученик»', () => {
    expect(studentState(other, COACH, { coachPlayerId: COACH.player.id })).toBe('student');
  });

  it('другой тренер или никакого — можно стать учеником', () => {
    expect(studentState(other, COACH, { coachPlayerId: null })).toBe('can-join');
    expect(studentState(other, COACH, { coachPlayerId: PLAYERS.third.id })).toBe('can-join');
  });
});

describe('годы тренера и пустой блок учеников', () => {
  it('годы по UTC+5: 31 декабря 21:00 UTC — уже следующий год', () => {
    expect(sinceYear('2023-12-31T21:00:00.000Z')).toBe('2024');
    expect(tenureYears({ from: '2020-03-01T00:00:00.000Z', to: '2024-02-01T00:00:00.000Z' })).toBe(
      '2020–2024',
    );
    expect(tenureYears({ from: '2024-03-01T00:00:00.000Z', to: '2024-09-01T00:00:00.000Z' })).toBe(
      '2024',
    );
  });

  it('учеников нет ни сейчас, ни раньше, ни на турнирах — блока нет', () => {
    expect(hasStudents({ current: 0, former: 0, tournaments: [] })).toBe(false);
    expect(hasStudents({ current: 0, former: 3, tournaments: [] })).toBe(true);
    // Заявились с этим тренером, но в анкете его нет (T3).
    expect(
      hasStudents({
        current: 0,
        former: 0,
        tournaments: [
          {
            tournament: {
              id: '00000000-0000-4000-8000-000000000001',
              name: 'Кубок зала',
              startsAt: '2026-10-18T12:00:00.000Z',
            },
            students: 2,
            gold: 1,
            silver: 0,
            bronze: 0,
          },
        ],
      }),
    ).toBe(true);
  });
});
