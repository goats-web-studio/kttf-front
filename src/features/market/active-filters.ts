import { PRODUCT_ATTRIBUTES, type BrandView, type ProductCategory } from '@kttf/shared/types';

import { fill, type Locale, type MessageKey } from '@/common/i18n';

import { brandsOf, catalogFilters, type CatalogSearch } from './catalog-search';
import {
  attributeLabel,
  formatNumber,
  optionAxisLabel,
  optionValueLabel,
  valueLabel,
  withUnit,
} from './labels';

export interface FilterChip {
  readonly key: string;
  readonly label: string;
  /** Что убрать из адреса, чтобы снять условие. */
  readonly remove: Readonly<Record<string, string | undefined>>;
}

/**
 * Чипы заданных условий — `docs/07` 6.2: «Вес: 80–90 г», «Производитель:
 * Butterfly». Каждый производитель — своим чипом, остальное — по условию.
 */
export function filterChips(
  category: ProductCategory,
  search: CatalogSearch,
  brands: readonly BrandView[],
  t: (key: MessageKey) => string,
  locale: Locale,
): FilterChip[] {
  const chip = (label: string, value: string): string => fill(t('filter.chip'), { label, value });
  const chips: FilterChip[] = [];

  if (search.q !== undefined) {
    chips.push({
      key: 'q',
      label: fill(t('filter.chipQuoted'), { value: search.q }),
      remove: { q: undefined },
    });
  }

  const selected = brandsOf(search);
  for (const id of selected) {
    const rest = selected.filter((item) => item !== id);
    chips.push({
      key: `brand-${id}`,
      label: chip(
        t('market.filter.brands'),
        brands.find((brand) => brand.id === id)?.name ?? t('common.loading'),
      ),
      remove: { brand: rest.length === 0 ? undefined : rest.join(',') },
    });
  }

  const filters = catalogFilters(category, search);
  for (const filter of filters.attrs) {
    const def = PRODUCT_ATTRIBUTES[category].find((item) => item.key === filter.key);
    const unit = def !== undefined && 'unit' in def ? def.unit : undefined;
    let value: string;

    if (filter.kind === 'in') {
      value = filter.values.map((item) => valueLabel(t, filter.key, item)).join(', ');
    } else if (filter.kind === 'range') {
      const low = filter.min === undefined ? undefined : formatNumber(filter.min, locale);
      const high = filter.max === undefined ? undefined : formatNumber(filter.max, locale);
      value = withUnit(
        t,
        low !== undefined && high !== undefined
          ? `${low}–${high}`
          : low !== undefined
            ? fill(t('market.range.from'), { value: low })
            : fill(t('market.range.to'), { value: high ?? '' }),
        unit,
      );
    } else {
      value = t(filter.value ? 'market.bool.yes' : 'market.bool.no');
    }

    chips.push({
      key: filter.key,
      label: chip(attributeLabel(t, filter.key), value),
      remove: { [filter.key]: undefined },
    });
  }

  for (const option of filters.options) {
    chips.push({
      key: option.axis,
      label: chip(
        t(optionAxisLabel(option.axis)),
        option.values.map((item) => optionValueLabel(t, locale, option.axis, item)).join(', '),
      ),
      remove: { [option.axis]: undefined },
    });
  }

  return chips;
}
