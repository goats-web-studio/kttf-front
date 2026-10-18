import type { MatchView } from '@kttf/shared/types';

import { fill, type MessageKey } from '@/common/i18n';

/**
 * Размеры сетки. Строки CSS, а не числа: экран зала считает в `vw`, страница
 * — в пикселях, и вся геометрия ниже собирается через `calc()`.
 */
export interface BracketSize {
  /** Ширина колонки круга. */
  readonly column: string;
  /** Высота строки игрока; встреча — две строки. */
  readonly row: string;
  /** Зазор между встречами по вертикали в первом круге. */
  readonly gapY: string;
  /** Зазор между кругами — в нём идут линии. */
  readonly gapX: string;
  readonly font: string;
  readonly caption: string;
}

export const BRACKET_PAGE: BracketSize = {
  column: '208px',
  row: '30px',
  gapY: '12px',
  gapX: '36px',
  font: '13px',
  caption: '12px',
};

/** Встреча за места: оба участника — проигравшие других встреч. */
export function isPlacement(match: MatchView): boolean {
  return match.sourceA?.kind === 'LOSER' || match.sourceB?.kind === 'LOSER';
}

/** Номер последнего круга основной сетки — финала. */
export function finalRound(matches: readonly MatchView[]): number {
  return Math.max(
    1,
    ...matches.filter((match) => !isPlacement(match)).map((match) => match.bracketRound ?? 1),
  );
}

/** Название круга по расстоянию до финала: «Финал», «Полуфинал», «1/4 финала»… */
export function roundName(fromFinal: number, t: (key: MessageKey) => string): string {
  if (fromFinal === 0) return t('results.bracket.final');
  if (fromFinal === 1) return t('results.bracket.semifinal');
  if (fromFinal === 2) return t('results.bracket.quarterfinal');

  return fill(t('results.bracket.of'), { n: String(2 ** fromFinal) });
}
