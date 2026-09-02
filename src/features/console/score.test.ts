import { describe, expect, it } from 'vitest';

import { quickResults, setsToWinFor } from './score';

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
