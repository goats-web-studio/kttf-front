import { PRODUCT_CATEGORIES, type BrandView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import type { ReactNode } from 'react';

import { formatCount, useLocale, useT } from '@/common/i18n';
import RouterLink from '@/common/ui/router-link';

import { categoryHref, categoryLabel } from './labels';

/**
 * Товары производителя по категориям — как «число товаров по категориям»
 * у RTTF. Чип ведёт в список категории с фильтром по производителю.
 */
export default function BrandCounts({ brand }: { readonly brand: BrandView }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const categories = PRODUCT_CATEGORIES.filter((category) => (brand.counts[category] ?? 0) > 0);

  if (categories.length === 0) return null;

  return (
    <Box
      component="ul"
      sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 1 }}
    >
      {categories.map((category) => (
        <Box component="li" key={category}>
          <Chip
            component={RouterLink}
            href={`${categoryHref(category)}?brand=${brand.id}`}
            clickable
            variant="outlined"
            label={`${t(categoryLabel(category))} · ${formatCount(brand.counts[category] ?? 0, locale)}`}
            sx={{ height: 44, fontVariantNumeric: 'tabular-nums' }}
          />
        </Box>
      ))}
    </Box>
  );
}
