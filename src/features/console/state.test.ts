import type { MatchView, TournamentSnapshotView } from '@kttf/shared/types';
import { describe, expect, it } from 'vitest';

import {
  CONSOLE_SNAPSHOT,
  PLAYER_IDS,
  PLAYERS,
  PLAYING_MATCH_ID,
  QUEUED_MATCH_ID,
} from '@/test/fixtures';

import {
  namesOf,
  ratingsOf,
  withOptimisticAssign,
  withOptimisticCancel,
  withOptimisticResult,
} from './state';

const NOW = '2026-09-05T11:00:00.000Z';

function matchById(state: TournamentSnapshotView, id: string): MatchView {
  const found = state.stages.flatMap((stage) => stage.matches).find((match) => match.id === id);

  if (found === undefined) {
    throw new Error(`Встречи ${id} нет в снимке`);
  }

  return found;
}

describe('счёт до ответа сервера', () => {
  it('применяется сразу — запрет №1', () => {
    const next = withOptimisticResult(
      CONSOLE_SNAPSHOT,
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
      CONSOLE_SNAPSHOT,
      PLAYING_MATCH_ID,
      { setsA: 3, setsB: 0, resultType: 'NORMAL' },
      NOW,
    );

    expect(matchById(next, PLAYING_MATCH_ID).tableNumber).toBe(1);
  });

  it('не трогает соседние встречи', () => {
    const next = withOptimisticResult(
      CONSOLE_SNAPSHOT,
      PLAYING_MATCH_ID,
      { setsA: 3, setsB: 0, resultType: 'NORMAL' },
      NOW,
    );

    expect(matchById(next, QUEUED_MATCH_ID)).toEqual(matchById(CONSOLE_SNAPSHOT, QUEUED_MATCH_ID));
  });

  it('продвижение по сетке не изобретается на клиенте', () => {
    // Победитель уезжает в следующий круг решением сервера: второй расчёт
    // сетки на клиенте — запрет №2 брифа.
    const next = withOptimisticResult(
      CONSOLE_SNAPSHOT,
      PLAYING_MATCH_ID,
      { setsA: 3, setsB: 0, resultType: 'NORMAL' },
      NOW,
    );

    expect(next.stages).toHaveLength(CONSOLE_SNAPSHOT.stages.length);
  });
});

describe('назначение на стол', () => {
  it('встреча уезжает в зону «Играется»', () => {
    const next = withOptimisticAssign(CONSOLE_SNAPSHOT, QUEUED_MATCH_ID, 2, NOW);

    expect(matchById(next, QUEUED_MATCH_ID)).toMatchObject({
      tableNumber: 2,
      status: 'PLAYING',
      startedAt: NOW,
    });
  });
});

describe('возврат встречи в очередь', () => {
  it('снимает счёт и стол — ТЗ 6.3', () => {
    const assigned = withOptimisticAssign(CONSOLE_SNAPSHOT, QUEUED_MATCH_ID, 2, NOW);
    const played = withOptimisticResult(
      assigned,
      QUEUED_MATCH_ID,
      { setsA: 3, setsB: 1, resultType: 'NORMAL' },
      NOW,
    );

    const next = withOptimisticCancel(played, QUEUED_MATCH_ID);

    expect(matchById(next, QUEUED_MATCH_ID)).toMatchObject({
      setsA: null,
      setsB: null,
      tableNumber: null,
      status: 'PENDING',
      startedAt: null,
      finishedAt: null,
    });
  });
});

describe('участники снимка', () => {
  it('имя и рейтинг находятся по идентификатору игрока', () => {
    expect(namesOf(CONSOLE_SNAPSHOT).get(PLAYER_IDS.first)).toContain(PLAYERS.first.lastName);
    // Рядом с фамилией стоит рейтинг на старте турнира — ТЗ 6.6, ТС 5.4.
    expect(ratingsOf(CONSOLE_SNAPSHOT).get(PLAYER_IDS.first)).toBe(PLAYERS.first.rating);
  });
});
