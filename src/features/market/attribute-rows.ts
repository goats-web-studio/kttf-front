import { PRODUCT_ATTRIBUTES, type ProductCategory } from '@kttf/shared/types';

import type { Locale, MessageKey } from '@/common/i18n';

import { attributeLabel, formatNumber, valueLabel, withUnit } from './labels';

export interface AttributeRow {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  /** Число по шкале производителя: сравнимо только внутри одной фирмы. */
  readonly brandScale: boolean;
}

const isString = (value: unknown): value is string => typeof value === 'string';
const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/**
 * Строки таблицы характеристик — по описанию категории (`docs/10` 4.3).
 *
 * Порядок — порядок описания. Незаполненное и значение чужого вида не
 * выводятся: пустая строка таблицы — тот же пустой блок (ADR-042), а кривое
 * значение из старого импорта не должно ронять страницу товара.
 */
export function attributeRows(
  category: ProductCategory,
  attrs: Readonly<Record<string, unknown>>,
  t: (key: MessageKey) => string,
  locale: Locale,
): AttributeRow[] {
  const rows: AttributeRow[] = [];

  for (const def of PRODUCT_ATTRIBUTES[category]) {
    const raw = attrs[def.key];
    let value: string | null = null;

    switch (def.kind) {
      case 'enum':
        if (isString(raw)) value = valueLabel(t, def.key, raw);
        break;
      case 'enums':
        if (Array.isArray(raw) && raw.length > 0 && raw.every(isString)) {
          value = raw.map((item) => valueLabel(t, def.key, item)).join(', ');
        }
        break;
      case 'number':
        if (isNumber(raw)) value = withUnit(t, formatNumber(raw, locale), def.unit);
        break;
      case 'numbers':
        if (Array.isArray(raw) && raw.length > 0 && raw.every(isNumber)) {
          value = withUnit(t, raw.map((item) => formatNumber(item, locale)).join(' / '), def.unit);
        }
        break;
      case 'bool':
        if (typeof raw === 'boolean') value = t(raw ? 'market.bool.yes' : 'market.bool.no');
        break;
      case 'text':
        if (isString(raw) && raw.trim() !== '') value = raw.trim();
        break;
    }

    if (value !== null) {
      rows.push({
        key: def.key,
        label: attributeLabel(t, def.key),
        value,
        brandScale: 'brandScale' in def,
      });
    }
  }

  return rows;
}
