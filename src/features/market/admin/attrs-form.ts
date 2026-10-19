import {
  PRODUCT_ATTRIBUTES,
  PRODUCT_OPTION_AXES,
  THICKNESS_PATTERN,
  type AttributeDef,
  type OptionAxis,
  type ProductCategory,
} from '@kttf/shared/types';

/**
 * Форма характеристик — из описания категории (`PRODUCT_ATTRIBUTES`).
 *
 * Черновик держит то, что видно в полях: число — строкой, как его набрали
 * («85,5»), несколько чисел — строкой через запятую. В `attrs` уходит только
 * заполненное: пустое поле — нет характеристики, а не ноль.
 */

/** Значение поля: текст, список выбранного или флажок. `undefined` — не задано. */
export type AttrInput = string | readonly string[] | boolean | undefined;
export type AttrsDraft = Readonly<Record<string, AttrInput>>;

/** Почему поле не ушло: не число или вне границ описания. */
export type AttrProblem = 'number' | 'range';

export function attrsDraftFrom(
  category: ProductCategory,
  attrs: Readonly<Record<string, unknown>>,
): AttrsDraft {
  const draft: Record<string, AttrInput> = {};

  for (const def of PRODUCT_ATTRIBUTES[category]) {
    const value = attrs[def.key];

    switch (def.kind) {
      case 'enum':
      case 'text':
        draft[def.key] = typeof value === 'string' ? value : '';
        break;
      case 'enums':
        draft[def.key] = Array.isArray(value)
          ? value.filter((item): item is string => typeof item === 'string')
          : [];
        break;
      case 'number':
        draft[def.key] = typeof value === 'number' ? String(value) : '';
        break;
      case 'numbers':
        draft[def.key] = Array.isArray(value)
          ? value.filter((item): item is number => typeof item === 'number').join(', ')
          : '';
        break;
      case 'bool':
        draft[def.key] = typeof value === 'boolean' ? value : undefined;
        break;
    }
  }

  return draft;
}

function parseNumber(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (normalized === '') return null;
  const number = Number(normalized);

  return Number.isFinite(number) ? number : Number.NaN;
}

function inBounds(def: AttributeDef, value: number): boolean {
  return def.kind !== 'number' && def.kind !== 'numbers'
    ? true
    : value >= def.min && value <= def.max;
}

/**
 * Черновик — в `attrs`. Неверные поля не уходят, а возвращаются списком:
 * форма подсвечивает их и не отправляет запрос.
 */
export function attrsFromDraft(
  category: ProductCategory,
  draft: AttrsDraft,
): { readonly attrs: Record<string, unknown>; readonly problems: Record<string, AttrProblem> } {
  const attrs: Record<string, unknown> = {};
  const problems: Record<string, AttrProblem> = {};

  for (const def of PRODUCT_ATTRIBUTES[category]) {
    const value = draft[def.key];

    switch (def.kind) {
      case 'enum':
        if (typeof value === 'string' && def.values.includes(value)) attrs[def.key] = value;
        break;
      case 'text':
        if (typeof value === 'string' && value.trim() !== '') {
          attrs[def.key] = value.trim().slice(0, def.max);
        }
        break;
      case 'enums':
        if (Array.isArray(value)) {
          const list = def.values.filter((item) => value.includes(item));
          if (list.length > 0) attrs[def.key] = list;
        }
        break;
      case 'number': {
        if (typeof value !== 'string') break;
        const number = parseNumber(value);
        if (number === null) break;
        if (Number.isNaN(number)) problems[def.key] = 'number';
        else if (!inBounds(def, number)) problems[def.key] = 'range';
        else attrs[def.key] = number;
        break;
      }
      case 'numbers': {
        if (typeof value !== 'string') break;
        const parts = value
          .split(/[,;/]/)
          .map((part) => parseNumber(part))
          .filter((part) => part !== null);
        if (parts.length === 0) break;
        if (parts.some((part) => Number.isNaN(part))) problems[def.key] = 'number';
        else if (parts.some((part) => !inBounds(def, part)) || parts.length > 10) {
          problems[def.key] = 'range';
        } else attrs[def.key] = parts;
        break;
      }
      case 'bool':
        if (typeof value === 'boolean') attrs[def.key] = value;
        break;
    }
  }

  return { attrs, problems };
}

// ---------- варианты ----------

export type OptionsDraft = Readonly<Partial<Record<OptionAxis, readonly string[]>>>;

/** Значение варианта, набранное руками: толщина — по образцу общего кода, размер — до 20 знаков. */
export function isOptionValue(axis: OptionAxis, value: string): boolean {
  if (axis === 'thickness') return THICKNESS_PATTERN.test(value);
  if (axis === 'size') return value.trim().length > 0 && value.trim().length <= 20;

  return true;
}

export function optionsDraftFrom(
  category: ProductCategory,
  options: Readonly<Record<string, unknown>>,
): OptionsDraft {
  const draft: Partial<Record<OptionAxis, readonly string[]>> = {};

  for (const axis of PRODUCT_OPTION_AXES[category]) {
    const value = options[axis];
    if (Array.isArray(value)) {
      draft[axis] = value.filter((item): item is string => typeof item === 'string');
    }
  }

  return draft;
}

/** Только оси категории и только непустые: пустая ось общим кодом не принимается. */
export function optionsFromDraft(
  category: ProductCategory,
  draft: OptionsDraft,
): Record<string, string[]> {
  const options: Record<string, string[]> = {};

  for (const axis of PRODUCT_OPTION_AXES[category]) {
    const values = [...new Set(draft[axis] ?? [])];
    if (values.length > 0) options[axis] = values;
  }

  return options;
}
