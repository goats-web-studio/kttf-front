import {
  PRODUCT_CATEGORY_SLUGS,
  PRODUCT_OPTION_AXES,
  type OptionAxis,
  type ProductCategory,
} from '@kttf/shared/types';
import {
  Backpack,
  CircleDot,
  Disc,
  Footprints,
  Layers,
  Package,
  Shirt,
  Table2,
  type LucideIcon,
} from 'lucide-react';

import type { Locale, MessageKey } from '@/common/i18n';
import { ru } from '@/common/i18n/ru';

/**
 * Подписи каталога — `docs/10` 4.3.
 *
 * В общем коде только ключи характеристик и значения перечислений, подписи
 * живут в словарях клиента, как подписи удобств клуба. Ключ характеристики —
 * строка из описания категории, поэтому подпись ищется в словаре по
 * собранному ключу. Новая характеристика без подписи не ломает страницу:
 * показывается ключ как есть, а тест словаря падает (`labels.test.ts`).
 */

type T = (key: MessageKey) => string;

function isMessageKey(key: string): key is MessageKey {
  return Object.hasOwn(ru, key);
}

function lookup(t: T, key: string, fallback: string): string {
  return isMessageKey(key) ? t(key) : fallback;
}

export const categoryLabel = (category: ProductCategory): MessageKey =>
  `market.category.${category}`;

export const categoryHref = (category: ProductCategory): string =>
  `/market/${PRODUCT_CATEGORY_SLUGS[category]}`;

export const productHref = (slug: string): string => `/market/items/${slug}`;

/** Иконки плиток категорий. Только вместе с подписью — запрет №11. */
export const CATEGORY_ICONS: Readonly<Record<ProductCategory, LucideIcon>> = {
  BLADE: Layers,
  RUBBER: Disc,
  BALL: CircleDot,
  CASE: Backpack,
  TOP: Shirt,
  BOTTOM: Shirt,
  SOCKS: Footprints,
  SHOES: Footprints,
  TABLE: Table2,
  OTHER: Package,
};

export const attributeLabelKey = (key: string): string => `market.attr.${key}`;

export function attributeLabel(t: T, key: string): string {
  return lookup(t, attributeLabelKey(key), key);
}

/**
 * Ключ подписи значения. Цвет губки — общими названиями цветов; остальные
 * перечисления — своими: «средняя» жёсткость и «среднее» игровое пятно
 * по-русски согласуются по-разному.
 */
export function valueLabelKey(attribute: string, value: string): string {
  return attribute === 'spongeColor'
    ? `market.color.${value}`
    : `market.value.${attribute}.${value}`;
}

export function valueLabel(t: T, attribute: string, value: string): string {
  return lookup(t, valueLabelKey(attribute, value), value);
}

export const optionAxisLabel = (axis: OptionAxis): MessageKey => `market.option.${axis}`;

/** Подпись значения варианта: ручка и цвет — словом, толщина — миллиметрами. */
export function optionValueLabel(t: T, locale: Locale, axis: OptionAxis, value: string): string {
  if (axis === 'handle') return lookup(t, `market.handle.${value}`, value);
  if (axis === 'color') return lookup(t, `market.color.${value}`, value);
  if (axis === 'thickness') {
    if (value === 'OX') return t('market.thickness.OX');
    if (value === 'max') return t('market.thickness.max');
    const number = Number(value);

    return Number.isFinite(number)
      ? `${formatNumber(number, locale, 1)} ${t('market.unit.mm')}`
      : value;
  }

  return value;
}

export function formatNumber(value: number, locale: Locale, minimumFractionDigits = 0): string {
  return new Intl.NumberFormat(locale, { minimumFractionDigits, maximumFractionDigits: 2 }).format(
    value,
  );
}

/** Число с единицей: «85 г», «2,1 мм», «47,5°». Градус пишется слитно. */
export function withUnit(t: T, text: string, unit: Unit | undefined): string {
  if (unit === undefined) return text;
  const sign = t(`market.unit.${unit}`);

  return unit === 'deg' ? `${text}${sign}` : `${text} ${sign}`;
}

export type Unit = 'g' | 'mm' | 'deg' | 'kg' | 'pcs';

/** Есть ли что показать — чтобы не выводить пустую карточку «Варианты». */
export function hasOptions(
  category: ProductCategory,
  options: Readonly<Record<string, readonly string[]>>,
): boolean {
  return PRODUCT_OPTION_AXES[category].some((axis) => (options[axis] ?? []).length > 0);
}
