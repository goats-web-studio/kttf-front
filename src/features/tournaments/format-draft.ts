import type { FormatConfig } from '@kttf/shared/types';

/**
 * Черновик схемы проведения — состояние формы, а не источник истины.
 *
 * Форма плоская: переключение схемы не должно терять уже введённое, иначе
 * организатор, заглянувший в «группы + сетка» и вернувшийся к круговой,
 * обнаружит пустые поля. Поэтому здесь лежат поля всех схем сразу, а
 * `toFormatConfig` собирает из них ровно то, что требует контракт.
 *
 * Второй модели настроек это не заводит (ADR-024): черновик живёт внутри
 * формы, наружу уходит `formatConfig` и только он.
 */
export type FormatType = FormatConfig['type'];

/** Группы задаются либо числом, либо размером — ТЗ 5.2, но не обоими. */
export type Sizing = 'count' | 'size';

export interface FormatDraft {
  readonly type: FormatType;
  readonly rounds: 1 | 2;
  readonly setsToWin: 2 | 3 | 4;
  readonly thirdPlace: boolean;
  readonly sizing: Sizing;
  readonly groupCount: number;
  readonly groupSize: number;
  readonly advancePerGroup: number;
  readonly groupRounds: 1 | 2;
  readonly groupSetsToWin: 2 | 3 | 4;
  readonly koSetsToWin: 2 | 3 | 4;
}

/**
 * Круговая до трёх побед — самая частая схема клубного турнира, с неё и
 * начинается форма. Требование ТЗ 4.2 — типовой турнир за тридцать секунд:
 * умолчания обязаны быть теми, которые чаще всего не трогают.
 */
export const DEFAULT_DRAFT: FormatDraft = {
  type: 'ROUND_ROBIN',
  rounds: 1,
  setsToWin: 3,
  thirdPlace: true,
  sizing: 'count',
  groupCount: 4,
  groupSize: 4,
  advancePerGroup: 2,
  groupRounds: 1,
  groupSetsToWin: 3,
  koSetsToWin: 3,
};

/**
 * Черновик — в конфигурацию контракта.
 *
 * Утешительной сетки здесь нет вовсе: схема принимает только `false`, и
 * предлагать выбор, который будет отвергнут, — ложное обещание (ADR-024).
 *
 * `finalGroupCount` не спрашивается: у «финалов по местам» финальных групп
 * ровно столько, сколько выходит из группы, и это проверяет схема. Поле,
 * значение которого предопределено, — лишний повод ошибиться.
 */
export function toFormatConfig(draft: FormatDraft): FormatConfig {
  const sizing =
    draft.sizing === 'count' ? { groupCount: draft.groupCount } : { groupSize: draft.groupSize };

  switch (draft.type) {
    case 'ROUND_ROBIN':
      return { type: 'ROUND_ROBIN', rounds: draft.rounds, setsToWin: draft.setsToWin };

    case 'KNOCKOUT':
      return {
        type: 'KNOCKOUT',
        setsToWin: draft.setsToWin,
        thirdPlace: draft.thirdPlace,
        consolation: false,
      };

    case 'GROUPS_KNOCKOUT':
      return {
        type: 'GROUPS_KNOCKOUT',
        ...sizing,
        advancePerGroup: draft.advancePerGroup,
        groupRounds: draft.groupRounds,
        groupSetsToWin: draft.groupSetsToWin,
        koSetsToWin: draft.koSetsToWin,
        thirdPlace: draft.thirdPlace,
      };

    default:
      return {
        type: 'GROUPS_FINAL_GROUPS',
        ...sizing,
        advancePerGroup: draft.advancePerGroup,
        groupRounds: draft.groupRounds,
        finalGroupCount: draft.advancePerGroup,
        setsToWin: draft.setsToWin,
      };
  }
}
