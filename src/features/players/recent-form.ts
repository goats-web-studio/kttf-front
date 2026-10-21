import type { PlayerTournamentMatchView, PlayerTournamentView } from '@kttf/shared/types';

/** Встреча «Формы» с турниром, где сыграна, — для подсказки у точки. */
export interface FormMatch {
  readonly match: PlayerTournamentMatchView;
  readonly tournament: PlayerTournamentView['tournament'];
}

/** Сколько последних встреч показывает «Форма» в шапке профиля. */
export const FORM_SIZE = 10;

/**
 * Последние встречи, свежая первой — для «Формы» в шапке профиля.
 *
 * Турниры приходят свежими сверху, а встречи внутри турнира — по ходу
 * турнира (ADR-048): последняя встреча турнира — последняя в списке. Ждать
 * вторую страницу результатов ради десяти точек незачем: у игрока, который
 * сыграл за первую страницу меньше десяти встреч, их и нет больше в шапке.
 */
export function recentForm(
  tournaments: readonly PlayerTournamentView[],
  size = FORM_SIZE,
): readonly FormMatch[] {
  const form: FormMatch[] = [];

  for (const item of tournaments) {
    for (const match of [...item.matches].reverse()) {
      if (form.length === size) return form;
      form.push({ match, tournament: item.tournament });
    }
  }

  return form;
}
