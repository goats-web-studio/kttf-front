import type { FormatDraft } from './format-draft';

/**
 * Совет по группам для ожидаемого состава — кнопка «Подобрать» в форме.
 *
 * Группа на четверых — привычная клубная: три встречи у каждого, вечер
 * укладывается. Из группы выходят двое. Число групп подбирается так, чтобы
 * вышедших было ровно на сетку — 4, 8, 16, 32 — без проходов без игры; если
 * так не получается, берётся число групп, при котором они ближе всего к
 * четверым. Группы от трёх до пяти человек: меньше — не таблица, больше —
 * слишком долго.
 *
 * У «финалов по местам» финальная группа собирает по одному из каждой
 * группы, поэтому групп не больше восьми: иначе финальная группа сама стала
 * бы круговой на десятки встреч.
 */
export interface GroupAdvice {
  readonly groupCount: number;
  readonly advancePerGroup: number;
}

/** Меньше — групповой этап не нужен: хватит круговой. */
export const MIN_FOR_GROUPS = 6;
/** Больше — круговая растягивается на весь день. */
export const MAX_FOR_ROUND_ROBIN = 10;

const ADVANCE = 2;
const TARGET_SIZE = 4;
const MIN_SIZE = 3;
const MAX_SIZE = 5;
const MAX_FINAL_GROUPS = 8;

function isPowerOfTwo(value: number): boolean {
  return value >= 2 && (value & (value - 1)) === 0;
}

export function adviseGroups(
  type: FormatDraft['type'],
  participants: number,
): GroupAdvice | null {
  if (type !== 'GROUPS_KNOCKOUT' && type !== 'GROUPS_FINAL_GROUPS') return null;
  if (participants < MIN_FOR_GROUPS) return null;

  const cap = type === 'GROUPS_FINAL_GROUPS' ? MAX_FINAL_GROUPS : Number.POSITIVE_INFINITY;
  const from = Math.max(2, Math.ceil(participants / MAX_SIZE));
  const to = Math.min(cap, Math.max(2, Math.floor(participants / MIN_SIZE)));

  let best: { groups: number; score: number } | null = null;

  for (let groups = from; groups <= to; groups += 1) {
    const evenBracket = type === 'GROUPS_KNOCKOUT' && isPowerOfTwo(groups * ADVANCE);
    const score = (evenBracket ? 0 : 10) + Math.abs(participants / groups - TARGET_SIZE);
    if (best === null || score < best.score) best = { groups, score };
  }

  const groupCount =
    best?.groups ?? Math.min(cap, Math.max(2, Math.round(participants / TARGET_SIZE)));

  return { groupCount, advancePerGroup: ADVANCE };
}

/** Черновик с применённым советом: группы задаются числом. */
export function applyAdvice(draft: FormatDraft, advice: GroupAdvice): FormatDraft {
  return {
    ...draft,
    sizing: 'count',
    groupCount: advice.groupCount,
    advancePerGroup: advice.advancePerGroup,
  };
}

/** Совет уже применён — кнопку «Подобрать» показывать незачем. */
export function adviceApplied(draft: FormatDraft, advice: GroupAdvice): boolean {
  return (
    draft.sizing === 'count' &&
    draft.groupCount === advice.groupCount &&
    draft.advancePerGroup === advice.advancePerGroup
  );
}
