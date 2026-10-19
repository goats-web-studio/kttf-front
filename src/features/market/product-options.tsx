import { PRODUCT_OPTION_AXES, type ProductCategory } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { useLocale, useT } from '@/common/i18n';

import { optionAxisLabel, optionValueLabel } from './labels';

/**
 * Варианты товара — ручка, толщина губки, цвет, размер (`docs/10` 3.1).
 *
 * Чипами, а не строкой текста, как у RTTF: позже магазин отметит, какие из
 * них есть у него, и чипы станут выбором. Пока это справка — чипы не
 * нажимаются. Оси без значений не выводятся, вариантов нет — раздела нет.
 */
export default function ProductOptions({
  category,
  options,
}: {
  readonly category: ProductCategory;
  readonly options: Readonly<Record<string, readonly string[]>>;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const axes = PRODUCT_OPTION_AXES[category].filter((axis) => (options[axis] ?? []).length > 0);

  if (axes.length === 0) return null;

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {axes.map((axis) => (
        <Box key={axis}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t(optionAxisLabel(axis))}
          </Typography>
          <Box
            component="ul"
            sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 1 }}
          >
            {(options[axis] ?? []).map((value) => (
              <Box component="li" key={value}>
                <Chip label={optionValueLabel(t, locale, axis, value)} variant="outlined" />
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
