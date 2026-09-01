import type { FormatConfig, StageType } from '@kttf/shared/types';

/**
 * Быстрые кнопки счёта — ТЗ 6.3.
 *
 * Требование: закрытие встречи не более чем в два действия. Значит, набор
 * кнопок обязан покрывать все исходы встречи целиком, а не предлагать ввод
 * по сетам как основной путь.
 */

/**
 * До скольких выигранных сетов идёт встреча на этом этапе.
 *
 * Значение живёт в `formatConfig` турнира, а не во встрече, и у схемы
 * «группы плюс сетка» оно разное на групповом этапе и в плей-офф. Считать его
 * здесь безопасно: счёт всё равно проверяет сервер и отвергает кодом
 * `INVALID_SCORE`, а расхождение схемы с сервером невозможно — обе стороны
 * читают один и тот же `formatConfig` (запрет №2).
 *
 * Длина встречи, меняющаяся к концовке (ТЗ 5.2), сюда не помещается: она
 * потребует колонку `Match.setsToWin` и ждёт решения владельца — ОВ-17.
 */
export function setsToWinFor(config: FormatConfig, stageType: StageType): number {
  switch (config.type) {
    case 'ROUND_ROBIN':
      return config.setsToWin;
    case 'KNOCKOUT':
      return config.setsToWin;
    case 'GROUPS_KNOCKOUT':
      return stageType === 'GROUPS' ? config.groupSetsToWin : config.koSetsToWin;
    case 'GROUPS_FINAL_GROUPS':
      return config.setsToWin;
  }
}

export interface QuickResult {
  readonly setsA: number;
  readonly setsB: number;
}

/**
 * Исходы встречи одной кнопкой.
 *
 * При `setsToWin` равном трём получается ровно набор из ТЗ 6.3:
 * `3:0 3:1 3:2` и `0:3 1:3 2:3`. Техническая победа стоит рядом отдельно —
 * она отличается не счётом, а типом результата.
 */
export function quickResults(setsToWin: number): readonly QuickResult[] {
  const wins = Array.from({ length: setsToWin }, (_unused, lost) => lost);

  return [
    ...wins.map((lost) => ({ setsA: setsToWin, setsB: lost })),
    ...wins.map((lost) => ({ setsA: lost, setsB: setsToWin })),
  ];
}
