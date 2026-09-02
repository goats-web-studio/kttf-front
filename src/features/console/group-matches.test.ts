import type { GroupStandingsView, MatchView, StageView } from '@kttf/shared/types';
import { describe, expect, it } from 'vitest';

import { isPlayedOut, matchesOf } from './group-matches';

/**
 * Доигранность группы — ТЗ 6.6.
 *
 * От неё зависит, спрашивать ли судью о равенстве очков. Спросить рано —
 * значит записать в журнал решение, принятое до того, как сыграна половина
 * группы (ADR-008).
 */

const STAGE_ID = 'stage-1';
const GROUP_ID = 'group-1';

function match(id: string, status: MatchView['status'], groupId: string | null): MatchView {
  return {
    id,
    stageId: STAGE_ID,
    groupId,
    playerAId: 'a',
    playerBId: 'b',
    sourceA: null,
    sourceB: null,
    status,
    tableNumber: null,
    setsA: null,
    setsB: null,
    resultType: null,
    bracketRound: 1,
    bracketSlot: 0,
    startedAt: null,
    finishedAt: null,
  };
}

function stages(matches: readonly MatchView[]): StageView[] {
  return [{ id: STAGE_ID, order: 1, type: 'GROUPS', name: 'Группы', groups: [], matches: [...matches] }];
}

const group = { stageId: STAGE_ID, groupId: GROUP_ID } as GroupStandingsView;

describe('встречи группы', () => {
  it('берутся только у своей группы', () => {
    const mine = match('m1', 'FINISHED', GROUP_ID);
    const found = matchesOf(stages([mine, match('m2', 'FINISHED', 'group-2')]), group);

    expect(found).toEqual([mine]);
  });

  it('у чужого этапа их нет вовсе', () => {
    const other = { stageId: 'stage-2', groupId: GROUP_ID } as GroupStandingsView;

    expect(matchesOf(stages([match('m1', 'FINISHED', GROUP_ID)]), other)).toEqual([]);
  });
});

describe('доигранность группы', () => {
  it('пока хоть одна встреча не сыграна — нет', () => {
    expect(isPlayedOut([match('m1', 'FINISHED', GROUP_ID), match('m2', 'PLAYING', GROUP_ID)])).toBe(
      false,
    );
  });

  it('снятая встреча считается сыгранной: ждать её нечего', () => {
    // Участник снялся, встреча отменена — ADR-009.
    expect(
      isPlayedOut([match('m1', 'FINISHED', GROUP_ID), match('m2', 'CANCELLED', GROUP_ID)]),
    ).toBe(true);
  });

  it('пустой список не доигран, а пуст', () => {
    // Иначе группа без встреч выглядела бы завершённой и звала бы судью
    // разрешать равенство, которого нет.
    expect(isPlayedOut([])).toBe(false);
  });
});
