import type { StageView } from '@kttf/shared/types';
import { describe, expect, it } from 'vitest';

import { availableResultTabs, searchResultTab } from './results-tabs';

/**
 * Вкладки страницы турнира.
 *
 * Пустая вкладка читается как поломка, поэтому проверяется главное: у
 * олимпийки нет «Групп», у круговой — «Сетки», а кривая ссылка не роняет
 * страницу.
 */

const stage = (type: StageView['type']): StageView => ({ type }) as StageView;

describe('вкладки результатов', () => {
  it('у групп с плей-офф есть всё', () => {
    expect(
      availableResultTabs(
        {
          stages: [stage('GROUPS'), stage('KNOCKOUT')],
          standings: { groups: [{}] },
          ratings: [{}],
        },
        { withPlayers: true },
      ),
    ).toEqual(['places', 'groups', 'bracket', 'matches', 'ratings', 'players']);
  });

  it('у олимпийки нет групп, у начатого без обсчёта — рейтинга', () => {
    expect(
      availableResultTabs(
        { stages: [stage('KNOCKOUT')], standings: { groups: [] }, ratings: [] },
        { withPlayers: true },
      ),
    ).toEqual(['places', 'bracket', 'matches', 'players']);
  });

  it('у круговой нет сетки', () => {
    expect(
      availableResultTabs(
        {
          stages: [stage('ROUND_ROBIN')],
          standings: { groups: [{}] },
          ratings: [],
        },
        { withPlayers: true },
      ),
    ).toEqual(['places', 'groups', 'matches', 'players']);
  });

  it('у организатора состава среди вкладок нет: он над ними', () => {
    expect(
      availableResultTabs(
        { stages: [stage('KNOCKOUT')], standings: { groups: [] }, ratings: [] },
        { withPlayers: false },
      ),
    ).toEqual(['places', 'bracket', 'matches']);
  });

  it('кривая вкладка в адресе — умолчание, а не ошибка', () => {
    expect(searchResultTab.parse('bracket')).toBe('bracket');
    expect(searchResultTab.parse('nope')).toBeUndefined();
    expect(searchResultTab.parse(undefined)).toBeUndefined();
  });
});
