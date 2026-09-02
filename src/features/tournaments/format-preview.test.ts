import { countRoundRobinMatches } from '@kttf/shared/brackets';
import { describe, expect, it } from 'vitest';

import { DEFAULT_DRAFT, toFormatConfig } from './format-draft';
import { previewFormat } from './format-preview';

/**
 * Предпросчёт схемы — ADR-024.
 *
 * Проверяется не арифметика движка: она покрыта в `kttf-shared` на 100%.
 * Здесь стережётся, что предпросчёт **зовёт движок**, а не считает своей
 * формулой, — расхождение с настоящей жеребьёвкой было бы молчаливым.
 */

describe('круговая', () => {
  it('встреч столько же, сколько насчитает движок', () => {
    const preview = previewFormat({ type: 'ROUND_ROBIN', rounds: 1, setsToWin: 3 }, 8);

    expect(preview.totalMatches).toBe(countRoundRobinMatches(8));
  });

  it('два круга удваивают встречи и туры', () => {
    const one = previewFormat({ type: 'ROUND_ROBIN', rounds: 1, setsToWin: 3 }, 8);
    const two = previewFormat({ type: 'ROUND_ROBIN', rounds: 2, setsToWin: 3 }, 8);

    expect(two.totalMatches).toBe(one.totalMatches * 2);
    expect(two.roundRobinRounds).toBe(one.roundRobinRounds * 2);
  });
});

describe('олимпийка', () => {
  it('размер сетки — ближайшая степень двойки, встреч на одну меньше', () => {
    const preview = previewFormat(
      { type: 'KNOCKOUT', setsToWin: 3, thirdPlace: false, consolation: false },
      12,
    );

    // Свободные проходы встреч не создают: несыгранной встречи не существует.
    expect(preview.bracketSize).toBe(16);
    expect(preview.totalMatches).toBe(11);
  });

  it('матч за третье место добавляет одну встречу', () => {
    const without = previewFormat(
      { type: 'KNOCKOUT', setsToWin: 3, thirdPlace: false, consolation: false },
      8,
    );
    const with3 = previewFormat(
      { type: 'KNOCKOUT', setsToWin: 3, thirdPlace: true, consolation: false },
      8,
    );

    expect(with3.totalMatches).toBe(without.totalMatches + 1);
  });
});

describe('группы и сетка', () => {
  const GROUPS = {
    type: 'GROUPS_KNOCKOUT',
    groupCount: 2,
    advancePerGroup: 2,
    groupRounds: 1,
    groupSetsToWin: 3,
    koSetsToWin: 3,
    thirdPlace: false,
  } as const;

  it('разбивает и считает обе части турнира', () => {
    const preview = previewFormat(GROUPS, 8);

    // Две группы по четыре: по шесть встреч в каждой, дальше четверо
    // разыгрывают сетку из трёх встреч.
    expect(preview.groups).toEqual([4, 4]);
    expect(preview.groupMatches).toBe(12);
    expect(preview.advancing).toBe(4);
    expect(preview.bracketSize).toBe(4);
    expect(preview.totalMatches).toBe(15);
  });

  it('два круга в группе меняют только групповую часть', () => {
    const one = previewFormat(GROUPS, 8);
    const two = previewFormat({ ...GROUPS, groupRounds: 2 }, 8);

    expect(two.groupMatches).toBe(one.groupMatches * 2);
    expect(two.bracketMatches).toBe(one.bracketMatches);
  });

  it('предупреждает, когда из групп выходит меньше двух', () => {
    // Ровно та конфигурация, которую отвергнет жеребьёвка.
    const preview = previewFormat({ ...GROUPS, groupCount: 1, advancePerGroup: 1 }, 8);

    expect(preview.advancing).toBe(1);
    expect(preview.tooFewAdvancing).toBe(true);
  });

  it('группа меньше зоны выхода отдаёт всех, кто в ней есть', () => {
    // Шесть человек на четыре группы: в двух по двое, в двух по одному.
    const preview = previewFormat({ ...GROUPS, groupCount: 4, advancePerGroup: 2 }, 6);

    expect(preview.advancing).toBe(6);
  });
});

describe('группы и финалы по местам', () => {
  it('финальных групп столько, сколько выходит из группы', () => {
    const preview = previewFormat(
      {
        type: 'GROUPS_FINAL_GROUPS',
        groupCount: 2,
        advancePerGroup: 2,
        groupRounds: 1,
        finalGroupCount: 2,
        setsToWin: 3,
      },
      8,
    );

    // Первые номера двух групп играют между собой, вторые — между собой.
    expect(preview.finalGroups).toEqual([2, 2]);
    expect(preview.finalGroupMatches).toBe(2);
    expect(preview.bracketSize).toBe(0);
  });
});

describe('вырожденные случаи', () => {
  it('меньше двух участников — считать нечего', () => {
    for (const count of [0, 1, -3, 1.5]) {
      expect(previewFormat(toFormatConfig(DEFAULT_DRAFT), count).totalMatches).toBe(0);
    }
  });
});
