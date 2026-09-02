import { formatConfigSchema } from '@kttf/shared/types';
import { describe, expect, it } from 'vitest';

import { DEFAULT_DRAFT, toFormatConfig, type FormatDraft, type FormatType } from './format-draft';

/**
 * Черновик схемы — в конфигурацию контракта.
 *
 * Главное здесь одно: форма не может собрать значение, которое отвергнет
 * сервер. Ограничения живут в Zod-схеме общего кода (ADR-024), и проверяются
 * они ею же, а не повторённым здесь списком правил.
 */

const TYPES: readonly FormatType[] = [
  'ROUND_ROBIN',
  'KNOCKOUT',
  'GROUPS_KNOCKOUT',
  'GROUPS_FINAL_GROUPS',
];

describe('перевод черновика в конфигурацию', () => {
  it('любая схема при любом способе задать группы проходит контракт', () => {
    for (const type of TYPES) {
      for (const sizing of ['count', 'size'] as const) {
        const draft: FormatDraft = { ...DEFAULT_DRAFT, type, sizing };
        const result = formatConfigSchema.safeParse(toFormatConfig(draft));

        expect(result.success, `${type}/${sizing}`).toBe(true);
      }
    }
  });

  it('задаётся ровно одно: либо число групп, либо размер', () => {
    const byCount = toFormatConfig({ ...DEFAULT_DRAFT, type: 'GROUPS_KNOCKOUT', sizing: 'count' });
    const bySize = toFormatConfig({ ...DEFAULT_DRAFT, type: 'GROUPS_KNOCKOUT', sizing: 'size' });

    expect(byCount).toMatchObject({ groupCount: DEFAULT_DRAFT.groupCount });
    expect(byCount).not.toHaveProperty('groupSize');
    expect(bySize).toMatchObject({ groupSize: DEFAULT_DRAFT.groupSize });
    expect(bySize).not.toHaveProperty('groupCount');
  });

  it('утешительная сетка не собирается вовсе', () => {
    // Схема принимает только `false`: предлагать выбор, который будет
    // отвергнут, — ложное обещание.
    expect(toFormatConfig({ ...DEFAULT_DRAFT, type: 'KNOCKOUT' })).toMatchObject({
      consolation: false,
    });
  });

  it('финальных групп столько же, сколько выходит из группы', () => {
    // Значение предопределено правилом «финалы по местам», и поле, которое
    // нельзя задать иначе, у человека не спрашивается.
    const config = toFormatConfig({
      ...DEFAULT_DRAFT,
      type: 'GROUPS_FINAL_GROUPS',
      advancePerGroup: 3,
    });

    expect(config).toMatchObject({ advancePerGroup: 3, finalGroupCount: 3 });
  });

  it('кругов в группе уходит в конфигурацию обеих групповых схем', () => {
    for (const type of ['GROUPS_KNOCKOUT', 'GROUPS_FINAL_GROUPS'] as const) {
      expect(toFormatConfig({ ...DEFAULT_DRAFT, type, groupRounds: 2 })).toMatchObject({
        groupRounds: 2,
      });
    }
  });

  it('умолчание — круговая до трёх побед', () => {
    // Типовой клубный турнир заводится за тридцать секунд только если
    // умолчания те, которые чаще всего не трогают (ТЗ 4.2).
    expect(toFormatConfig(DEFAULT_DRAFT)).toEqual({
      type: 'ROUND_ROBIN',
      rounds: 1,
      setsToWin: 3,
    });
  });
});
