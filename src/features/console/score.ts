import { playoffSetsToWin } from '@kttf/shared/brackets';
import type { FormatConfig, MatchResultInput, MatchView, StageType } from '@kttf/shared/types';

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
 * Длина конкретной встречи плей-офф — `matchSetsToWin` ниже.
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

/**
 * До скольких побед идёт эта встреча — с длинами по кругам плей-офф
 * (ADR-044).
 *
 * Правило общее с сервером — `playoffSetsToWin`, а не своя копия: финал до
 * четырёх побед консоль без сети обязана знать так же, как сервер.
 * Число кругов берётся из самих встреч этапа: финал всегда стоит в
 * последнем круге, даже когда первый круг прорежен свободными проходами.
 */
export function matchSetsToWin(
  config: FormatConfig,
  stage: { readonly type: StageType; readonly matches: readonly MatchView[] },
  match: Pick<MatchView, 'bracketRound' | 'bracketSlot'>,
): number {
  const base = setsToWinFor(config, stage.type);

  if (
    stage.type !== 'KNOCKOUT' ||
    match.bracketRound === null ||
    match.bracketSlot === null ||
    (config.type !== 'KNOCKOUT' && config.type !== 'GROUPS_KNOCKOUT')
  ) {
    return base;
  }

  const rounds = Math.max(...stage.matches.map((item) => item.bracketRound ?? 0));

  return playoffSetsToWin(
    base,
    config.playoffSetsToWin,
    { round: match.bracketRound, slot: match.bracketSlot },
    rounds,
  );
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

/**
 * Отказ по ходу встречи — ADR-061.
 *
 * Оставшиеся сеты засчитываются сопернику: у него ровно `setsToWin`, у
 * отказавшегося — сколько он успел взять. Так встреча закрывается при любом
 * счёте на момент отказа, даже если отказавшийся вёл, а разница сетов в
 * таблице отражает сыгранное. Рейтинг отказ не меняет (ТЗ 7, `M = 0`).
 *
 * @param retiree Кто отказался.
 * @param won Сколько сетов отказавшийся выиграл до отказа: от нуля до `setsToWin − 1`.
 */
export function retiredResult(
  setsToWin: number,
  retiree: 'A' | 'B',
  won: number,
): MatchResultInput {
  const kept = Math.min(Math.max(0, won), setsToWin - 1);

  return retiree === 'A'
    ? { setsA: kept, setsB: setsToWin, resultType: 'RETIRED' }
    : { setsA: setsToWin, setsB: kept, resultType: 'RETIRED' };
}
