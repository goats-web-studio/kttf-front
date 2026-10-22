import type { GroupStandingsView, MatchView, StageView } from '@kttf/shared/types';

import { isSettled } from './queue';

/**
 * Встречи группы и её доигранность — ТЗ 6.6.
 *
 * Одна на таблицы и на разрешение равенства: обе части консоли отвечают на
 * один и тот же вопрос — какие встречи относятся к этой таблице.
 */

/** Встречи, из которых складывается таблица группы. */
export function matchesOf(
  stages: readonly StageView[],
  group: GroupStandingsView,
): readonly MatchView[] {
  const stage = stages.find((current) => current.id === group.stageId);

  return stage?.matches.filter((match) => match.groupId === group.groupId) ?? [];
}

/**
 * Сыграны ли все встречи группы.
 *
 * Снятая встреча тоже сыграна: результата у неё нет, но и ждать её нечего.
 * Так же и встреча снявшегося участника (ADR-009, ADR-061): её исход даёт
 * расчёт таблицы на сервере. Это не правило предметной области, а вопрос
 * «осталось ли ещё что-то сыграть»: места и равенства до конца группы не
 * окончательны.
 */
export function isPlayedOut(
  matches: readonly MatchView[],
  withdrawn?: ReadonlySet<string>,
): boolean {
  return matches.length > 0 && matches.every((match) => isSettled(match, withdrawn));
}
