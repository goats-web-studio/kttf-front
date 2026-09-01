import type { MatchUpdateResult, MatchView } from '@kttf/shared/types';
import { describe, expect, it } from 'vitest';

import {
  CONSOLE_STATE,
  PLAYER_IDS,
  PLAYERS,
  PLAYING_MATCH_ID,
  QUEUED_MATCH_ID,
} from '@/test/fixtures';

import {
  applyUpdate,
  namesOf,
  ratingsOf,
  withOptimisticAssign,
  withOptimisticCancel,
  withOptimisticResult,
} from './state';

const NOW = '2026-09-05T11:00:00.000Z';

function matchById(state: typeof CONSOLE_STATE, id: string): MatchView {
  const found = state.stages.flatMap((stage) => stage.matches).find((match) => match.id === id);

  if (found === undefined) {
    throw new Error(`Встречи ${id} нет в снимке`);
  }

  return found;
}

describe('счёт до ответа сервера', () => {
  it('применяется сразу — запрет №1', () => {
    const next = withOptimisticResult(
      CONSOLE_STATE,
      PLAYING_MATCH_ID,
      { setsA: 3, setsB: 1, resultType: 'NORMAL' },
      NOW,
    );

    expect(matchById(next, PLAYING_MATCH_ID)).toMatchObject({
      setsA: 3,
      setsB: 1,
      status: 'FINISHED',
      finishedAt: NOW,
    });
  });

  it('не снимает встречу со стола', () => {
    // Сервер тоже не снимает: в зале стол занят, пока за него не сели
    // следующие игроки (ТЗ 6.1).
    const next = withOptimisticResult(
      CONSOLE_STATE,
      PLAYING_MATCH_ID,
      { setsA: 3, setsB: 0, resultType: 'NORMAL' },
      NOW,
    );

    expect(matchById(next, PLAYING_MATCH_ID).tableNumber).toBe(1);
  });

  it('не трогает остальные встречи', () => {
    const next = withOptimisticResult(
      CONSOLE_STATE,
      PLAYING_MATCH_ID,
      { setsA: 3, setsB: 0, resultType: 'NORMAL' },
      NOW,
    );

    expect(matchById(next, QUEUED_MATCH_ID)).toEqual(matchById(CONSOLE_STATE, QUEUED_MATCH_ID));
  });
});

describe('назначение и возврат в очередь', () => {
  it('ставит встречу на стол до ответа сервера', () => {
    const next = withOptimisticAssign(CONSOLE_STATE, QUEUED_MATCH_ID, 2, NOW);

    expect(matchById(next, QUEUED_MATCH_ID)).toMatchObject({
      tableNumber: 2,
      status: 'PLAYING',
      startedAt: NOW,
    });
  });

  it('возврат снимает и счёт, и стол — ADR-021', () => {
    const assigned = withOptimisticAssign(CONSOLE_STATE, QUEUED_MATCH_ID, 2, NOW);
    const next = withOptimisticCancel(assigned, QUEUED_MATCH_ID);

    expect(matchById(next, QUEUED_MATCH_ID)).toMatchObject({
      tableNumber: null,
      status: 'PENDING',
      setsA: null,
      startedAt: null,
    });
  });
});

describe('итог действия от сервера', () => {
  const played: MatchView = {
    ...matchById(CONSOLE_STATE, PLAYING_MATCH_ID),
    setsA: 3,
    setsB: 2,
    status: 'FINISHED',
    finishedAt: NOW,
  };

  it('применяет и саму встречу, и те, чей состав изменился следом', () => {
    // Ради этого сервер и возвращает `updated`: турнир не перезапрашивается,
    // а экран не мигает посреди зала (ADR-019).
    const advanced: MatchView = {
      ...matchById(CONSOLE_STATE, QUEUED_MATCH_ID),
      playerAId: PLAYER_IDS.first,
    };

    const update: MatchUpdateResult = {
      match: played,
      updated: [advanced],
      nextStage: null,
      blockedByTies: [],
    };

    const next = applyUpdate(CONSOLE_STATE, update);

    expect(matchById(next, PLAYING_MATCH_ID).setsA).toBe(3);
    expect(matchById(next, QUEUED_MATCH_ID).playerAId).toBe(PLAYER_IDS.first);
  });

  it('добавляет достроенный этап и держит порядок этапов', () => {
    const update: MatchUpdateResult = {
      match: played,
      updated: [],
      nextStage: {
        id: 'stage-playoff',
        order: 2,
        type: 'KNOCKOUT',
        name: 'Плей-офф',
        groups: [],
        matches: [],
      },
      blockedByTies: [],
    };

    const next = applyUpdate(CONSOLE_STATE, update);

    expect(next.stages.map((stage) => stage.order)).toEqual([1, 2]);
    expect(next.stages.at(-1)?.name).toBe('Плей-офф');
  });
});

describe('участники', () => {
  it('дают имя и рейтинг по идентификатору', () => {
    expect(namesOf(CONSOLE_STATE).get(PLAYER_IDS.first)).toContain(PLAYERS.first.lastName);
    expect(ratingsOf(CONSOLE_STATE).get(PLAYER_IDS.first)).toBe(PLAYERS.first.rating);
  });
});
