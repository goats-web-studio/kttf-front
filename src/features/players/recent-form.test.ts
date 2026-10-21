import type { PlayerTournamentMatchView, PlayerTournamentView } from '@kttf/shared/types';
import { describe, expect, it } from 'vitest';

import { recentForm } from './recent-form';

function match(id: string, won: boolean): PlayerTournamentMatchView {
  return {
    matchId: id,
    stageName: 'Группа',
    groupLabel: null,
    roundFromFinal: null,
    placement: false,
    startedAt: null,
    playedAt: null,
    opponent: null,
    opponentRating: null,
    ratingBefore: null,
    setsFor: won ? 3 : 1,
    setsAgainst: won ? 1 : 3,
    won,
    resultType: 'NORMAL',
    delta: null,
    durationMinutes: null,
  };
}

function tournament(id: string, matches: PlayerTournamentMatchView[]): PlayerTournamentView {
  return {
    tournament: {
      id,
      name: id,
      startsAt: '2026-10-01T10:00:00.000Z',
      status: 'RATED',
      level: 'CLUB',
      club: { id: 'club', name: 'Клуб' },
    },
    place: null,
    placeTo: null,
    participants: 8,
    ratingBefore: null,
    delta: null,
    ratingAfter: null,
    matches,
  };
}

describe('recentForm — «Форма» в шапке профиля', () => {
  it('свежая первой: свежий турнир, внутри — с последней встречи', () => {
    const form = recentForm([
      tournament('new', [match('n1', true), match('n2', false)]),
      tournament('old', [match('o1', true), match('o2', true)]),
    ]);

    expect(form.map((entry) => entry.match.matchId)).toEqual(['n2', 'n1', 'o2', 'o1']);
    expect(form[0]?.tournament.id).toBe('new');
  });

  it('не больше заданного числа встреч', () => {
    const many = Array.from({ length: 7 }, (_, index) => match(`m${String(index)}`, true));

    expect(recentForm([tournament('a', many), tournament('b', many)], 10)).toHaveLength(10);
  });

  it('без встреч — пусто', () => {
    expect(recentForm([])).toEqual([]);
  });
});
