import type { BracketSourceView, MatchView, StageView } from '@kttf/shared/types';

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

/** Этапы, у которых есть сетка. Круговая и группы рисуются таблицами. */
export const BRACKET_STAGES: ReadonlySet<StageView['type']> = new Set<StageView['type']>([
  'KNOCKOUT',
  'CONSOLATION',
]);

/** Есть ли у турнира что рисовать сеткой — иначе вкладки «Сетка» в консоли нет. */
export function hasBracket(stages: readonly StageView[]): boolean {
  return stages.some((stage) => BRACKET_STAGES.has(stage.type));
}

/**
 * «Победитель встречи: полуфинал 1» вместо пустого места. Сетка
 * разворачивается целиком при жеребьёвке (ADR-019), и встреча существует до
 * того, как определились её участники, — подпись говорит, кого она ждёт.
 */
export function sourceLabel(
  source: BracketSourceView | null,
  byId: ReadonlyMap<string, MatchView>,
  final: number,
  t: (key: MessageKey) => string,
): string {
  if (source === null) {
    return t('results.match.pending');
  }

  const kind = t(source.kind === 'WINNER' ? 'results.match.winnerOf' : 'results.match.loserOf');
  const from = byId.get(source.matchId);

  if (from?.bracketSlot == null) {
    return kind;
  }

  // Номер внутри круга и сам круг: «№1» без круга повторялся в полуфинале и
  // в финале и путал. Слот считается с нуля, человек — с единицы.
  const round = roundName(final - (from.bracketRound ?? 1), t).toLocaleLowerCase();

  return `${kind}: ${round} ${String(from.bracketSlot + 1)}`;
}
