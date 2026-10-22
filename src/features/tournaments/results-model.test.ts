import type {
  MatchView,
  ParticipantRatingView,
  ResultParticipantView,
  StageView,
  TournamentStandingsView,
} from '@kttf/shared/types';
import { describe, expect, it } from 'vitest';

import { RESULTS } from '@/test/fixtures';

import {
  averageRating,
  buildResultsModel,
  deltasByMatch,
  finishes,
  matchMinutes,
  matchProgress,
  orderPlacements,
  placeLabel,
  startRatings,
  tallies,
} from './results-model';

/**
 * Сводки страницы турнира. Проверяется то, ради чего они есть: зритель видит
 * в таблице честные победы, сеты, круг вылета и изменение рейтинга.
 */

function match(over: Partial<MatchView> & { id: string }): MatchView {
  return {
    stageId: 's',
    groupId: null,
    playerAId: null,
    playerBId: null,
    sourceA: null,
    sourceB: null,
    status: 'FINISHED',
    tableNumber: null,
    setsA: null,
    setsB: null,
    resultType: 'NORMAL',
    bracketRound: 1,
    bracketSlot: 0,
    startedAt: null,
    finishedAt: null,
    ...over,
  };
}

function stage(type: StageView['type'], matches: MatchView[], order = 0): StageView {
  return { id: `stage-${type}`, order, type, name: type, groups: [], matches };
}

const knockout = stage(
  'KNOCKOUT',
  [
    match({ id: 'sf1', playerAId: 'a', playerBId: 'd', setsA: 3, setsB: 1, bracketRound: 1 }),
    match({
      id: 'sf2',
      playerAId: 'b',
      playerBId: 'c',
      setsA: 0,
      setsB: 3,
      bracketRound: 1,
      bracketSlot: 1,
    }),
    match({ id: 'f', playerAId: 'a', playerBId: 'c', setsA: 3, setsB: 2, bracketRound: 2 }),
    match({
      id: 'third',
      playerAId: 'd',
      playerBId: 'b',
      setsA: 1,
      setsB: 3,
      bracketRound: 2,
      bracketSlot: 1,
      sourceA: { kind: 'LOSER', matchId: 'sf1' },
      sourceB: { kind: 'LOSER', matchId: 'sf2' },
    }),
  ],
  1,
);

const standings: TournamentStandingsView = {
  tournamentId: 't',
  groups: [
    {
      stageId: 'g',
      groupId: 'g1',
      label: 'гр. 1',
      rows: [
        {
          participant: 'a',
          played: 1,
          wins: 1,
          losses: 0,
          points: 2,
          setsWon: 3,
          setsLost: 0,
          setDiff: 3,
          ballsWon: 0,
          ballsLost: 0,
          ballDiff: 0,
          place: 1,
        },
        {
          participant: 'e',
          played: 1,
          wins: 0,
          losses: 1,
          points: 1,
          setsWon: 0,
          setsLost: 3,
          setDiff: -3,
          ballsWon: 0,
          ballsLost: 0,
          ballDiff: 0,
          place: 2,
        },
      ],
      unresolved: [],
    },
  ],
};

describe('сыгранное игроком', () => {
  it('победы, поражения и сеты по всем этапам', () => {
    const result = tallies([knockout]);

    expect(result.get('a')).toEqual({ played: 2, wins: 2, losses: 0, setsWon: 6, setsLost: 3 });
    expect(result.get('c')).toEqual({ played: 2, wins: 1, losses: 1, setsWon: 5, setsLost: 3 });
  });

  it('несыгранная встреча и встреча без участника не считаются', () => {
    const result = tallies([
      stage('KNOCKOUT', [
        match({ id: 'x', playerAId: 'a', playerBId: 'b', status: 'PENDING' }),
        match({ id: 'y', playerAId: 'a', playerBId: null, setsA: 3, setsB: 0 }),
      ]),
    ]);

    expect(result.size).toBe(0);
  });

  it('прогресс турнира — без вычеркнутых', () => {
    expect(
      matchProgress([
        stage('KNOCKOUT', [
          ...knockout.matches,
          match({ id: 'p', playerAId: 'x', playerBId: 'y', status: 'PENDING' }),
          match({ id: 'z', status: 'CANCELLED' }),
        ]),
      ]),
    ).toEqual({ played: 4, total: 5 });
  });
});

describe('где игрок закончил турнир', () => {
  const result = finishes([knockout], standings);

  it('победитель, финалист и проигравшие за третье место', () => {
    expect(result.get('a')).toEqual({ kind: 'CHAMPION' });
    expect(result.get('c')).toEqual({ kind: 'BRACKET', fromFinal: 0, consolation: false });
    expect(result.get('b')).toEqual({ kind: 'THIRD_PLACE', won: true });
    expect(result.get('d')).toEqual({ kind: 'THIRD_PLACE', won: false });
  });

  it('не вышедший из группы — с меткой группы и местом', () => {
    expect(result.get('e')).toEqual({ kind: 'GROUP', label: 'гр. 1', place: 2 });
  });

  it('в сетке за места финал победителя не делает чемпионом', () => {
    const exit = finishes(
      [
        stage('CONSOLATION', [
          match({ id: 'c', playerAId: 'x', playerBId: 'y', setsA: 3, setsB: 0 }),
        ]),
      ],
      { tournamentId: 't', groups: [] },
    );

    expect(exit.get('x')).toBeUndefined();
    expect(exit.get('y')).toEqual({ kind: 'BRACKET', fromFinal: 0, consolation: true });
  });

  it('встреча без исхода или без участника ничего не меняет', () => {
    const exit = finishes(
      [
        stage('KNOCKOUT', [
          match({ id: 'n', playerAId: 'x', playerBId: 'y', status: 'PENDING' }),
          match({ id: 'm', playerAId: 'x', playerBId: null, setsA: 3, setsB: 0 }),
        ]),
        stage('GROUPS', []),
      ],
      { tournamentId: 't', groups: [] },
    );

    expect(exit.size).toBe(0);
  });
});

describe('рейтинг на странице', () => {
  const leader: ParticipantRatingView = {
    playerId: 'a',
    ratingAtStart: '400.00',
    ratingAfter: '412.00',
    totalDelta: '12.00',
    events: [
      { matchId: 'f', ratingBefore: '400.00', delta: '12.00', ratingAfter: '412.00' },
      { matchId: null, ratingBefore: '412.00', delta: '0.00', ratingAfter: '412.00' },
    ],
  };
  const ratings = [leader];

  it('изменение за встречу находится по встрече и игроку', () => {
    const deltas = deltasByMatch(ratings);

    expect(deltas.get('f:a')).toBe('12.00');
    expect(deltas.size).toBe(1);
  });

  it('у фамилии — рейтинг на старте, без снимка — текущий', () => {
    const [first, second] = RESULTS.participants;
    if (first === undefined || second === undefined) throw new Error('нет участников');

    const map = startRatings([first, second], [{ ...leader, playerId: first.player.id }]);

    expect(map.get(first.player.id)).toBe('400.00');
    expect(map.get(second.player.id)).toBe(second.player.rating);
  });

  it('средний рейтинг поля — целым, без участников его нет', () => {
    expect(
      averageRating(
        new Map([
          ['a', '300.00'],
          ['b', '401.00'],
        ]),
      ),
    ).toBe(351);
    expect(averageRating(new Map())).toBeNull();
  });
});

describe('итоговая таблица', () => {
  const [first, second, third] = RESULTS.participants;
  if (first === undefined || second === undefined || third === undefined) {
    throw new Error('нет участников');
  }
  const placed: ResultParticipantView = { ...first, place: 1, reason: 'BRACKET' };
  const sharing: ResultParticipantView = { ...second, place: null, reason: 'SHARED' };
  const out: ResultParticipantView = { ...third, place: null, reason: 'GROUP_EXIT' };
  const shared = [{ participants: [second.player.id, 'other'], places: [5, 6, 7, 8] }];

  it('делящие — диапазоном мест', () => {
    expect(placeLabel(placed, shared)).toBe('1');
    expect(placeLabel(sharing, shared)).toBe('5–8');
    expect(placeLabel(out, shared)).toBeNull();
    expect(placeLabel(sharing, [{ participants: [second.player.id], places: [] }])).toBeNull();
  });

  it('порядок: места, затем делящие, затем выбывшие по месту в группе', () => {
    const finish = new Map([
      [third.player.id, { kind: 'GROUP', label: 'гр. 1', place: 3 } as const],
    ]);

    expect(orderPlacements([out, sharing, placed], shared, finish)).toEqual([placed, sharing, out]);
    // Без сведений о группе выбывший — в самом конце, порядок сервера сохраняется.
    expect(orderPlacements([out, out], shared, new Map())).toEqual([out, out]);
  });
});

describe('встреча', () => {
  it('длительность в минутах, без времени — нет', () => {
    expect(
      matchMinutes(
        match({
          id: 'm',
          startedAt: '2026-10-01T10:00:00.000Z',
          finishedAt: '2026-10-01T10:24:30.000Z',
        }),
      ),
    ).toBe(25);
    expect(matchMinutes(match({ id: 'm' }))).toBeNull();
    expect(
      matchMinutes(
        match({
          id: 'm',
          startedAt: '2026-10-01T10:00:00.000Z',
          finishedAt: '2026-10-01T10:00:00.000Z',
        }),
      ),
    ).toBeNull();
  });
});

describe('модель страницы целиком', () => {
  it('собирается из ответа сервера', () => {
    const model = buildResultsModel(RESULTS, new Map());
    const [first] = RESULTS.participants;
    if (first === undefined) throw new Error('нет участников');

    expect(model.ratings.has(first.player.id)).toBe(true);
    expect(model.rating.size).toBe(RESULTS.ratings.length);
  });
});
