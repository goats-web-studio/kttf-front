import { describe, expect, it } from 'vitest';

import { COACH_LIST_ITEM } from '@/test/coach-fixtures';
import { PLAYERS } from '@/test/fixtures';

import {
  coachFields,
  coachOptions,
  coachSearchText,
  initialCoachOption,
  sameCoachOption,
} from './coach-options';

const referenced = [
  { ...PLAYERS.second, ratingUpdatedAt: null },
  // Тот же игрок, что и тренер KTTF: в «Других» он не повторяется.
  { ...PLAYERS.first, ratingUpdatedAt: null },
] as unknown as Parameters<typeof coachOptions>[2];

describe('варианты поля «Тренер»', () => {
  it('сверху тренеры KTTF, ниже другие без повторов, последним — «Вписать»', () => {
    const options = coachOptions('Тимур', [COACH_LIST_ITEM], referenced);

    expect(options.map((option) => option.kind)).toEqual(['kttf', 'typed']);
    expect(options.at(-1)).toEqual({ kind: 'typed', name: 'Тимур' });
  });

  it('«Другие» фильтруются по словам на месте', () => {
    const second = `${PLAYERS.second.lastName} ${PLAYERS.second.firstName}`;
    const options = coachOptions(PLAYERS.second.lastName.slice(0, 3), [], referenced);

    expect(
      options.filter((option) => option.kind === 'player').map((option) => option.name),
    ).toEqual([second]);
  });

  it('пустой ввод — подсказка без «Вписать»; дословное совпадение — тоже без него', () => {
    const name = `${PLAYERS.first.lastName} ${PLAYERS.first.firstName}`;

    expect(coachOptions('', [COACH_LIST_ITEM], []).map((option) => option.kind)).toEqual(['kttf']);
    expect(
      coachOptions(name, [COACH_LIST_ITEM], []).some((option) => option.kind === 'typed'),
    ).toBe(false);
  });

  it('выбор тренера кладёт его профиль игрока, вписанное — имя, очистка — оба пусто', () => {
    const [kttf] = coachOptions('', [COACH_LIST_ITEM], []);
    if (kttf === undefined) throw new Error('нет варианта');

    expect(coachFields(kttf)).toEqual({ coachPlayerId: PLAYERS.first.id, coachName: undefined });
    expect(coachFields({ kind: 'typed', name: 'Сериков Тимур' })).toEqual({
      coachPlayerId: undefined,
      coachName: 'Сериков Тимур',
    });
    expect(coachFields(null)).toEqual({ coachPlayerId: undefined, coachName: undefined });
  });

  it('сохранённый тренер — по имени из профиля, вписанный — строкой', () => {
    expect(initialCoachOption(PLAYERS.first.id, 'Ержанов Асан')).toMatchObject({
      kind: 'player',
      playerId: PLAYERS.first.id,
      name: 'Ержанов Асан',
    });
    expect(initialCoachOption(undefined, 'Сериков Тимур')).toEqual({
      kind: 'typed',
      name: 'Сериков Тимур',
    });
    expect(initialCoachOption(undefined, null)).toBeNull();
  });

  it('поиск — от двух букв; один и тот же тренер — по профилю', () => {
    expect(coachSearchText(' с ')).toBeUndefined();
    expect(coachSearchText(' се ')).toBe('се');

    const [kttf] = coachOptions('', [COACH_LIST_ITEM], []);
    if (kttf === undefined) throw new Error('нет варианта');
    expect(sameCoachOption(kttf, initialCoachOption(PLAYERS.first.id, 'x') ?? kttf)).toBe(true);
  });
});
