import type { MatchView, StageView } from '@kttf/shared/types';
import { describe, expect, it } from 'vitest';

import { ru } from '@/common/i18n/ru';

import {
  allPlayed,
  buildQueue,
  buildTables,
  matchLabel,
  playingMatches,
  suggestedTable,
} from './queue';

/**
 * Очередь — то, на что судья смотрит весь турнир. Ошибка здесь не рушит
 * данные, но заставляет игроков ждать дольше, чем нужно, а это ровно та
 * разница между «пользуюсь» и «забросил», о которой говорит бриф.
 */

const A = 'player-a';
const B = 'player-b';
const C = 'player-c';
const D = 'player-d';

function match(overrides: Partial<MatchView> & { id: string }): MatchView {
  return {
    stageId: 'stage-1',
    groupId: null,
    playerAId: null,
    playerBId: null,
    sourceA: null,
    sourceB: null,
    status: 'PENDING',
    tableNumber: null,
    setsA: null,
    setsB: null,
    resultType: null,
    bracketRound: 1,
    bracketSlot: 0,
    startedAt: null,
    finishedAt: null,
    ...overrides,
  };
}

function stage(matches: readonly MatchView[], overrides: Partial<StageView> = {}): StageView {
  return {
    id: 'stage-1',
    order: 1,
    type: 'ROUND_ROBIN',
    name: 'Круговая',
    groups: [],
    matches: [...matches],
    ...overrides,
  };
}

describe('очередь встреч', () => {
  it('не берёт встречу, участники которой ещё не определены', () => {
    // Полуфинал существует раньше своих участников (ADR-019). Поставить его
    // на стол нельзя: играть некому.
    const queue = buildQueue([
      stage([match({ id: 'm1', sourceA: { kind: 'WINNER', matchId: 'm0' } })]),
    ]);

    expect(queue).toHaveLength(0);
  });

  it('не берёт сыгранную и стоящую на столе', () => {
    const queue = buildQueue([
      stage([
        match({ id: 'm1', playerAId: A, playerBId: B, status: 'FINISHED' }),
        match({ id: 'm2', playerAId: C, playerBId: D, status: 'PLAYING', tableNumber: 1 }),
      ]),
    ]);

    expect(queue).toHaveLength(0);
  });

  it('ставит вперёд тех, кто ещё не играл', () => {
    const queue = buildQueue([
      stage([
        match({
          id: 'played',
          playerAId: A,
          playerBId: B,
          status: 'FINISHED',
          finishedAt: '2026-09-05T10:00:00.000Z',
        }),
        match({ id: 'waited', playerAId: A, playerBId: B, bracketSlot: 1 }),
        match({ id: 'fresh', playerAId: C, playerBId: D, bracketSlot: 2 }),
      ]),
    ]);

    expect(queue.map((item) => item.match.id)).toEqual(['fresh', 'waited']);
  });

  it('считает пару свободной по позднейшему из двоих', () => {
    // A закончил в 10:00, C — в 10:30. Пара A—C ждёт с 10:30, а не с 10:00:
    // раньше C был занят.
    const queue = buildQueue([
      stage([
        match({
          id: 'early',
          playerAId: A,
          playerBId: B,
          status: 'FINISHED',
          finishedAt: '2026-09-05T10:00:00.000Z',
        }),
        match({
          id: 'late',
          playerAId: C,
          playerBId: D,
          status: 'FINISHED',
          finishedAt: '2026-09-05T10:30:00.000Z',
        }),
        match({ id: 'a-c', playerAId: A, playerBId: C, bracketSlot: 1 }),
        match({ id: 'b-d', playerAId: B, playerBId: D, bracketSlot: 2 }),
      ]),
    ]);

    // Обе пары свободны с одного и того же момента — 10:30, — поэтому порядок
    // задаёт расписание. Проверяется другое: ни одна не сочтена ждущей с 10:00.
    expect(queue.every((item) => item.waitingSince === '2026-09-05T10:30:00.000Z')).toBe(true);
  });

  it('отмечает встречу, после которой обоим играть нечего', () => {
    const queue = buildQueue([
      stage([
        match({ id: 'last', playerAId: A, playerBId: B }),
        match({ id: 'other', playerAId: C, playerBId: D, bracketSlot: 1 }),
      ]),
    ]);

    expect(queue.every((item) => item.lastForBoth)).toBe(true);
  });

  it('не отмечает встречу как последнюю, если игроку предстоит ещё одна', () => {
    const queue = buildQueue([
      stage([
        match({ id: 'first', playerAId: A, playerBId: B }),
        match({ id: 'second', playerAId: A, playerBId: C, bracketSlot: 1 }),
      ]),
    ]);

    expect(queue.find((item) => item.match.id === 'first')?.lastForBoth).toBe(false);
  });

  it('опускает вниз пару, где игрок ещё за столом, и называет стол', () => {
    // A ещё играет на третьем столе: звать его на следующую встречу нельзя,
    // хотя по времени ожидания он был бы первым.
    const queue = buildQueue([
      stage([
        match({ id: 'now', playerAId: A, playerBId: B, status: 'PLAYING', tableNumber: 3 }),
        match({ id: 'busy', playerAId: A, playerBId: C, bracketSlot: 1 }),
        match({
          id: 'free',
          playerAId: C,
          playerBId: D,
          bracketSlot: 2,
          status: 'PENDING',
        }),
        match({
          id: 'old',
          playerAId: C,
          playerBId: D,
          status: 'FINISHED',
          finishedAt: '2026-09-05T10:00:00.000Z',
        }),
      ]),
    ]);

    expect(queue.map((item) => [item.match.id, item.busyTable])).toEqual([
      ['free', null],
      ['busy', 3],
    ]);
  });

  it('подписывает встречу этапом и группой', () => {
    const queue = buildQueue([
      stage([match({ id: 'm1', playerAId: A, playerBId: B, groupId: 'g1' })], {
        type: 'GROUPS',
        name: 'Группы',
        groups: [{ id: 'g1', label: 'Группа A', order: 1, participants: [A, B] }],
      }),
    ]);

    expect(queue[0]?.groupLabel).toBe('Группа A');
    expect(queue[0]?.stageName).toBe('Группы');
  });
});

describe('столы', () => {
  const stages = [
    stage([
      match({ id: 'm1', playerAId: A, playerBId: B, status: 'PLAYING', tableNumber: 2 }),
      match({ id: 'm2', playerAId: C, playerBId: D }),
    ]),
  ];

  it('перечисляет все столы зала, включая свободные', () => {
    const tables = buildTables(3, stages);

    expect(tables.map((table) => table.number)).toEqual([1, 2, 3]);
    expect(tables[1]).toMatchObject({ status: 'PLAYING' });
    expect(tables[1]?.match?.id).toBe('m1');
    expect(tables[0]).toMatchObject({ status: 'FREE', match: null });
  });

  it('различает свободный стол и стол с закрытой встречей', () => {
    // ТЗ 6.1 называет три состояния, а не два. Сервер не снимает номер стола
    // при вводе счёта: в зале стол занят, пока за него не сели новые игроки.
    const tables = buildTables(2, [
      stage([
        match({
          id: 'done',
          status: 'FINISHED',
          tableNumber: 1,
          finishedAt: '2026-09-05T10:00:00.000Z',
        }),
      ]),
    ]);

    expect(tables[0]).toMatchObject({ status: 'AWAITING' });
    expect(tables[0]?.match?.id).toBe('done');
    expect(tables[1]).toMatchObject({ status: 'FREE' });
  });

  it('на столе висит последняя закрытая встреча, а не первая', () => {
    const tables = buildTables(1, [
      stage([
        match({
          id: 'older',
          status: 'FINISHED',
          tableNumber: 1,
          finishedAt: '2026-09-05T10:00:00.000Z',
        }),
        match({
          id: 'newer',
          status: 'FINISHED',
          tableNumber: 1,
          finishedAt: '2026-09-05T11:00:00.000Z',
        }),
      ]),
    ]);

    expect(tables[0]?.match?.id).toBe('newer');
  });

  it('предлагает наименьший свободный стол', () => {
    // Предсказуемость важнее оптимизации: судья запоминает зал по номерам.
    expect(suggestedTable(buildTables(3, stages))).toBe(1);
  });

  it('предлагает стол с закрытой встречей, когда пустых не осталось', () => {
    // Иначе к концу турнира, когда на каждом столе лежит чей-то результат,
    // назначать станет некуда и очередь встанет.
    const tables = buildTables(1, [
      stage([
        match({
          id: 'done',
          status: 'FINISHED',
          tableNumber: 1,
          finishedAt: '2026-09-05T10:00:00.000Z',
        }),
      ]),
    ]);

    expect(suggestedTable(tables)).toBe(1);
  });

  it('не предлагает стол, когда все заняты игрой', () => {
    expect(
      suggestedTable([
        { number: 1, status: 'PLAYING', match: match({ id: 'm1' }) },
        { number: 2, status: 'PLAYING', match: match({ id: 'm2' }) },
      ]),
    ).toBeNull();
  });

  it('показывает идущие встречи по порядку столов', () => {
    const playing = playingMatches([
      stage([
        match({ id: 'second', status: 'PLAYING', tableNumber: 5 }),
        match({ id: 'first', status: 'PLAYING', tableNumber: 1 }),
      ]),
    ]);

    expect(playing.map((item) => item.id)).toEqual(['first', 'second']);
  });
});

describe('готовность к завершению', () => {
  it('турнир доигран, когда не осталось несыгранных встреч', () => {
    expect(
      allPlayed([
        stage([match({ id: 'm1', status: 'FINISHED' }), match({ id: 'm2', status: 'CANCELLED' })]),
      ]),
    ).toBe(true);
  });

  it('одна незакрытая встреча означает, что турнир идёт', () => {
    expect(allPlayed([stage([match({ id: 'm1', status: 'PLAYING' })])])).toBe(false);
  });
});

describe('подпись встречи', () => {
  // Ведущий объявляет вызов по подписи: «Плей-офф» без круга ему ничего не
  // говорит, нужны «Финал» и «Матч за 3-е место».
  const t = (key: keyof typeof ru): string => ru[key];
  const semi1 = match({ id: 's1', bracketRound: 1, bracketSlot: 0 });
  const semi2 = match({ id: 's2', bracketRound: 1, bracketSlot: 1 });
  const final = match({
    id: 'f',
    bracketRound: 2,
    bracketSlot: 0,
    sourceA: { kind: 'WINNER', matchId: 's1' },
    sourceB: { kind: 'WINNER', matchId: 's2' },
  });
  const third = match({
    id: 'b',
    bracketRound: 2,
    bracketSlot: 1,
    sourceA: { kind: 'LOSER', matchId: 's1' },
    sourceB: { kind: 'LOSER', matchId: 's2' },
  });
  const stages = [stage([semi1, semi2, final, third], { type: 'KNOCKOUT', name: 'Плей-офф' })];

  it('называет круг сетки первым, этап — следом', () => {
    expect(matchLabel(stages, final, t)).toBe(`${ru['results.bracket.final']} · Плей-офф`);
    expect(matchLabel(stages, semi1, t)).toBe(`${ru['results.bracket.semifinal']} · Плей-офф`);
  });

  it('матч за 3-е место — не второй финал', () => {
    expect(matchLabel(stages, third, t)).toBe(`${ru['results.bracket.thirdPlace']} · Плей-офф`);
  });

  it('без словаря подпись прежняя — этап и группа', () => {
    expect(matchLabel(stages, final)).toBe('Плей-офф');
  });
});
