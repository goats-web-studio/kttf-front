import { describe, expect, it } from 'vitest';

import type { MatchView } from '@kttf/shared/types';

import { matchSetsToWin, quickResults, setsToWinFor } from './score';

describe('длина встречи по схеме', () => {
  it('у групп и плей-офф она разная', () => {
    const config = {
      type: 'GROUPS_KNOCKOUT',
      groupRounds: 1,
      groupCount: 2,
      advancePerGroup: 2,
      groupSetsToWin: 2,
      koSetsToWin: 3,
      thirdPlace: false,
      exitBracket: false,
    } as const;

    expect(setsToWinFor(config, 'GROUPS')).toBe(2);
    expect(setsToWinFor(config, 'KNOCKOUT')).toBe(3);
  });

  it('у круговой и олимпийки она одна на весь турнир', () => {
    expect(setsToWinFor({ type: 'ROUND_ROBIN', rounds: 1, setsToWin: 3 }, 'ROUND_ROBIN')).toBe(3);
    expect(
      setsToWinFor(
        { type: 'KNOCKOUT', setsToWin: 4, thirdPlace: true, consolation: false },
        'KNOCKOUT',
      ),
    ).toBe(4);
  });
});

describe('длина встречи по кругу плей-офф — ADR-044', () => {
  /** Встреча сетки на 8: три круга, финал и встреча за третье — в третьем. */
  function knockoutMatch(round: number, slot: number): MatchView {
    return { bracketRound: round, bracketSlot: slot } as MatchView;
  }

  const stage = {
    type: 'KNOCKOUT' as const,
    matches: [knockoutMatch(1, 0), knockoutMatch(2, 0), knockoutMatch(3, 0), knockoutMatch(3, 1)],
  };
  const config = {
    type: 'GROUPS_KNOCKOUT' as const,
    groupCount: 2,
    advancePerGroup: 4,
    groupRounds: 1 as const,
    groupSetsToWin: 2 as const,
    koSetsToWin: 3 as const,
    thirdPlace: true,
    exitBracket: false,
    playoffSetsToWin: { final: 4 as const },
  };

  it('финал консоль считает той же длиной, что сервер', () => {
    expect(matchSetsToWin(config, stage, knockoutMatch(3, 0))).toBe(4);
    expect(matchSetsToWin(config, stage, knockoutMatch(3, 1))).toBe(3);
    expect(matchSetsToWin(config, stage, knockoutMatch(1, 0))).toBe(3);
  });

  it('группы длин по кругам не знают', () => {
    expect(
      matchSetsToWin(
        config,
        { type: 'GROUPS', matches: [] },
        { bracketRound: 1, bracketSlot: null },
      ),
    ).toBe(2);
  });
});

describe('быстрые кнопки', () => {
  it('при трёх сетах дают набор из ТЗ 6.3', () => {
    // Требование дословное: 3:0 3:1 3:2 и 0:3 1:3 2:3.
    expect(quickResults(3)).toEqual([
      { setsA: 3, setsB: 0 },
      { setsA: 3, setsB: 1 },
      { setsA: 3, setsB: 2 },
      { setsA: 0, setsB: 3 },
      { setsA: 1, setsB: 3 },
      { setsA: 2, setsB: 3 },
    ]);
  });

  it('покрывают все исходы и при другой длине встречи', () => {
    // Иначе на схеме до двух сетов часть исходов пришлось бы вводить руками,
    // и требование «не более двух действий» перестало бы выполняться.
    expect(quickResults(2)).toHaveLength(4);
    expect(quickResults(4)).toHaveLength(8);
  });
});
