import type { CreateTournamentInput, TournamentView } from '@kttf/shared/types';
import { describe, expect, it } from 'vitest';

import { TOURNAMENT } from '@/test/fixtures';

import { sameShape, tournamentPatch } from './tournament-patch';

/** Форма, открытая на турнире и ничего не поменявшая. */
function untouched(tournament: TournamentView): CreateTournamentInput {
  return {
    clubId: tournament.clubId,
    name: tournament.name,
    startsAt: tournament.startsAt,
    entryFee: tournament.entryFee,
    level: tournament.level,
    tableCount: tournament.tableCount,
    reviewOutOfRating: tournament.reviewOutOfRating,
    // Тот же формат в другом порядке ключей — как его собирает форма.
    formatConfig: { ...tournament.formatConfig },
    ...(tournament.seedingConfig === null ? {} : { seedingConfig: tournament.seedingConfig }),
    ...(tournament.ratingCapMax === null ? {} : { ratingCapMax: Number(tournament.ratingCapMax) }),
  };
}

describe('правка турнира', () => {
  it('без изменений запроса нет: схема не уходит и жеребьёвку не сбрасывает', () => {
    expect(tournamentPatch(TOURNAMENT, untouched(TOURNAMENT))).toBeNull();
  });

  it('тот же момент в другой записи изменением не считается', () => {
    const values = { ...untouched(TOURNAMENT), startsAt: '2026-09-05T09:00:00Z' };

    expect(tournamentPatch(TOURNAMENT, values)).toBeNull();
  });

  it('стёртая планка уходит null, планка-строка сравнивается числом', () => {
    const capped = { ...TOURNAMENT, ratingCapMax: '400.00' };

    expect(tournamentPatch(capped, untouched(capped))).toBeNull();
    const cleared = { ...untouched(capped) };
    delete cleared.ratingCapMax;

    expect(tournamentPatch(capped, cleared)).toEqual({ ratingCapMax: null });
  });

  it('изменённая схема уходит целиком, остальное — только изменённое', () => {
    const values: CreateTournamentInput = {
      ...untouched(TOURNAMENT),
      name: 'Кубок осени',
      formatConfig: { type: 'ROUND_ROBIN', rounds: 2, setsToWin: 3 },
    };

    expect(tournamentPatch(TOURNAMENT, values)).toEqual({
      name: 'Кубок осени',
      formatConfig: { type: 'ROUND_ROBIN', rounds: 2, setsToWin: 3 },
    });
  });
});

describe('сравнение конфигураций', () => {
  it('порядок ключей и отсутствующий undefined не важны', () => {
    expect(sameShape({ a: 1, b: { c: 2 } }, { b: { c: 2 }, a: 1, d: undefined })).toBe(true);
    expect(sameShape({ a: 1 }, { a: 2 })).toBe(false);
    expect(sameShape([1, 2], [1, 2])).toBe(true);
    expect(sameShape([1, 2], [2, 1])).toBe(false);
    expect(sameShape(null, {})).toBe(false);
  });
});
