import type { StageView } from '@kttf/shared/types';
import { z } from 'zod';

import type { MessageKey } from '@/common/i18n';

/** Этапы, у которых есть сетка. Круговая и группы рисуются таблицами. */
export const BRACKET_STAGES: ReadonlySet<StageView['type']> = new Set<StageView['type']>([
  'KNOCKOUT',
  'CONSOLATION',
]);

/**
 * Вкладки страницы начатого турнира.
 *
 * Раньше места, таблицы, сетка, все встречи и рейтинг шли одной лентой в
 * шесть экранов: игрок в зале, открывший ссылку ради своей группы, листал
 * мимо сорока встреч. Порядок — по тому, зачем страницу открывают чаще.
 */
export const RESULT_TABS = [
  'places',
  'groups',
  'bracket',
  'matches',
  'ratings',
  'players',
] as const;

export type ResultTab = (typeof RESULT_TABS)[number];

export const RESULT_TAB_LABELS: Readonly<Record<ResultTab, MessageKey>> = {
  places: 'results.tabs.places',
  groups: 'results.tabs.groups',
  bracket: 'results.tabs.bracket',
  matches: 'results.tabs.matches',
  ratings: 'results.tabs.ratings',
  players: 'results.tabs.players',
};

/**
 * Вкладка в адресе: ссылку «смотри сетку» пересылают в чат, и она обязана
 * открыться на сетке (docs/07-design-system.md, 6.2). Кривое значение —
 * первая вкладка, а не экран ошибки.
 */
export const searchResultTab = z.enum(RESULT_TABS).optional().catch(undefined);

interface ResultsShape {
  readonly stages: readonly StageView[];
  readonly standings: { readonly groups: readonly unknown[] };
  readonly ratings: readonly unknown[];
}

/**
 * Вкладки, которым есть что показать. Пустая вкладка читается как поломка:
 * у олимпийки нет групп, у круговой — сетки.
 *
 * Состав у организатора не вкладка: он над вкладками, потому что снять
 * участника и принять заявку нужно посреди турнира, а не после поиска.
 */
export function availableResultTabs(
  results: ResultsShape,
  { withPlayers }: { readonly withPlayers: boolean },
): readonly ResultTab[] {
  const has: Record<ResultTab, boolean> = {
    places: true,
    groups: results.standings.groups.length > 0,
    bracket: results.stages.some((stage) => BRACKET_STAGES.has(stage.type)),
    matches: results.stages.length > 0,
    ratings: results.ratings.length > 0,
    players: withPlayers,
  };

  return RESULT_TABS.filter((tab) => has[tab]);
}
