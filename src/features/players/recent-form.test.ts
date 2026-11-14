import type { DuelView, PlayerTournamentMatchView, PlayerTournamentView } from '@kttf/shared/types';
import { describe, expect, it } from 'vitest';

import { recentForm, type DuelFormInput } from './recent-form';

function match(
  id: string,
  won: boolean,
  playedAt: string | null = null,
): PlayerTournamentMatchView {
  return {
    matchId: id,
    stageName: 'Группа',
    groupLabel: null,
    roundFromFinal: null,
    placement: false,
    startedAt: null,
    playedAt,
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

function tournament(
  id: string,
  matches: PlayerTournamentMatchView[],
  startsAt = '2026-10-01T10:00:00.000Z',
): PlayerTournamentView {
  return {
    tournament: {
      id,
      name: id,
      startsAt,
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

const ME = '00000000-0000-4000-8000-000000000001';
const OTHER = '00000000-0000-4000-8000-000000000002';

function duel(
  id: string,
  playedAt: string,
  delta: string,
  result: {
    readonly winnerId: string;
    readonly winnerSets: number;
    readonly loserSets: number;
  } | null,
  extra: Partial<DuelView> = {},
): DuelFormInput {
  return {
    point: {
      tournamentId: null,
      tournamentName: null,
      duel: { id, opponentName: 'Ким Артём', kind: 'DUEL' },
      playedAt,
      ratingBefore: '300',
      ratingAfter: '300',
      delta,
      matches: 1,
    },
    detail: {
      annulledAt: null,
      result:
        result === null
          ? null
          : {
              ...result,
              reportedById: ME,
              reportedAt: playedAt,
              confirmBy: playedAt,
              confirmedAt: playedAt,
              disputeComment: null,
              resolutionComment: null,
            },
      ...extra,
    } as unknown as DuelView,
  };
}

describe('recentForm — «Форма» в шапке профиля', () => {
  it('свежая первой: свежий турнир, внутри — с последней встречи', () => {
    const form = recentForm({
      tournaments: [
        tournament('new', [match('n1', true), match('n2', false)]),
        tournament('old', [match('o1', true), match('o2', true)]),
      ],
    });

    expect(form.map((entry) => entry.key)).toEqual(['n2', 'n1', 'o2', 'o1']);
    expect(form[0]?.href).toBe('/tournaments/new');
    expect(form[0]?.tournamentName).toBe('new');
  });

  it('не больше заданного числа встреч', () => {
    const many = Array.from({ length: 7 }, (_, index) => match(`m${String(index)}`, true));

    expect(
      recentForm({ tournaments: [tournament('a', many), tournament('b', many)] }, 10),
    ).toHaveLength(10);
  });

  it('без встреч — пусто', () => {
    expect(recentForm({ tournaments: [] })).toEqual([]);
  });

  it('дуэль встаёт в ряд по времени между турнирами', () => {
    const form = recentForm({
      tournaments: [
        tournament('new', [match('n1', true, '2026-10-20T18:00:00.000Z')]),
        tournament('old', [match('o1', false, '2026-10-10T18:00:00.000Z')]),
      ],
      duels: [
        duel('d1', '2026-10-15T18:00:00.000Z', '+4.20', {
          winnerId: ME,
          winnerSets: 3,
          loserSets: 1,
        }),
      ],
      playerId: ME,
    });

    expect(form.map((entry) => entry.key)).toEqual(['n1', 'duel-d1', 'o1']);
    expect(form[1]).toMatchObject({
      source: 'DUEL',
      won: true,
      score: [3, 1],
      opponent: 'Ким Артём',
      href: '/duels/d1',
      tournamentName: null,
    });
  });

  it('проигранная дуэль — счёт своими сетами вперёд', () => {
    const [entry] = recentForm({
      tournaments: [],
      duels: [
        duel('d1', '2026-10-15T18:00:00.000Z', '-3.10', {
          winnerId: OTHER,
          winnerSets: 3,
          loserSets: 2,
        }),
      ],
      playerId: ME,
    });

    expect(entry).toMatchObject({ won: false, score: [2, 3] });
  });

  it('дуэль без страницы — победа по знаку изменения, без счёта', () => {
    const input = duel('d1', '2026-10-15T18:00:00.000Z', '+2.00', null);
    const [entry] = recentForm({
      tournaments: [],
      duels: [{ point: input.point, detail: undefined }],
      playerId: ME,
    });

    expect(entry).toMatchObject({ won: true, score: null });
  });

  it('нулевое изменение без счёта и отменённая дуэль в ряд не встают', () => {
    const zero = duel('d1', '2026-10-15T18:00:00.000Z', '0.00', null);
    const annulled = duel(
      'd2',
      '2026-10-16T18:00:00.000Z',
      '+5.00',
      { winnerId: ME, winnerSets: 3, loserSets: 0 },
      {
        annulledAt: '2026-10-17T10:00:00.000Z',
      },
    );

    expect(recentForm({ tournaments: [], duels: [zero, annulled], playerId: ME })).toEqual([]);
  });
});
