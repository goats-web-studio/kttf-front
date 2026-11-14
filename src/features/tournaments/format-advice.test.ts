import { describe, expect, it } from 'vitest';

import { adviseGroups, applyAdvice, adviceApplied } from './format-advice';
import { DEFAULT_DRAFT } from './format-draft';

describe('adviseGroups — подбор групп под ожидаемый состав', () => {
  it('16 человек — 4 группы по четверо, 8 выходят ровно на сетку', () => {
    expect(adviseGroups('GROUPS_KNOCKOUT', 16)).toEqual({ groupCount: 4, advancePerGroup: 2 });
  });

  it('64 человека — 16 групп, 32 выходят ровно на сетку', () => {
    expect(adviseGroups('GROUPS_KNOCKOUT', 64)).toEqual({ groupCount: 16, advancePerGroup: 2 });
  });

  it('12 человек — 4 группы по трое: сетка на 8 без проходов', () => {
    expect(adviseGroups('GROUPS_KNOCKOUT', 12)).toEqual({ groupCount: 4, advancePerGroup: 2 });
  });

  it('группы — от трёх до пяти человек', () => {
    for (let n = 6; n <= 80; n += 1) {
      const advice = adviseGroups('GROUPS_KNOCKOUT', n);
      expect(advice).not.toBeNull();
      const size = n / (advice?.groupCount ?? 1);
      expect(size, `n=${String(n)}`).toBeGreaterThanOrEqual(3);
      expect(size, `n=${String(n)}`).toBeLessThanOrEqual(5);
    }
  });

  it('у финалов по местам — не больше восьми групп', () => {
    expect(adviseGroups('GROUPS_FINAL_GROUPS', 64)?.groupCount).toBe(8);
    expect(adviseGroups('GROUPS_FINAL_GROUPS', 16)?.groupCount).toBe(4);
  });

  it('мало участников или схема без групп — совета нет', () => {
    expect(adviseGroups('GROUPS_KNOCKOUT', 5)).toBeNull();
    expect(adviseGroups('ROUND_ROBIN', 30)).toBeNull();
    expect(adviseGroups('KNOCKOUT', 30)).toBeNull();
  });

  it('совет ставит группы числом и узнаётся как применённый', () => {
    const advice = { groupCount: 6, advancePerGroup: 2 };
    const next = applyAdvice({ ...DEFAULT_DRAFT, sizing: 'size' }, advice);

    expect(next).toMatchObject({ sizing: 'count', groupCount: 6, advancePerGroup: 2 });
    expect(adviceApplied(next, advice)).toBe(true);
    expect(adviceApplied(DEFAULT_DRAFT, advice)).toBe(false);
  });
});
