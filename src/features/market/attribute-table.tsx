import type { ProductCategory } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useId, useState, type ReactNode } from 'react';

import { fill, useLocale, useT } from '@/common/i18n';

import { attributeRows } from './attribute-rows';

/** На телефоне видно столько главных характеристик, остальное — по кнопке (`docs/10` 5.5). */
export const COLLAPSED_ROWS = 5;

interface AttributeTableProps {
  readonly category: ProductCategory;
  readonly attrs: Readonly<Record<string, unknown>>;
  /** Свернуть до пяти главных — раскладка телефона. */
  readonly collapsed?: boolean;
}

/**
 * Характеристики товара — строки описания категории с единицами.
 *
 * Скорость, контроль и вибрация у фирм в своих шкалах: «90» одной фирмы и
 * «90» другой не сравнимы, хотя выглядят так (`docs/10` 4.3, слабость RTTF).
 * Такие числа помечены звёздочкой с подсказкой, а под таблицей — та же
 * пометка текстом: подсказку на телефоне не увидеть.
 *
 * Пусто — таблицы нет вовсе (ADR-042).
 */
export default function AttributeTable({
  category,
  attrs,
  collapsed = false,
}: AttributeTableProps): ReactNode {
  const t = useT();
  const locale = useLocale();
  const id = useId();
  const [all, setAll] = useState(false);
  const rows = attributeRows(category, attrs, t, locale);

  if (rows.length === 0) return null;

  const shown = collapsed && !all ? rows.slice(0, COLLAPSED_ROWS) : rows;
  const scaled = shown.some((row) => row.brandScale);
  const note = t('market.brandScale.note');

  return (
    <Box>
      <Box
        component="dl"
        sx={{
          m: 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          columnGap: 2,
        }}
      >
        {shown.map((row) => (
          <Box
            key={row.key}
            sx={{
              display: 'contents',
              '& > *': { py: 1, borderTop: 1, borderColor: 'divider' },
              '&:first-of-type > *': { borderTop: 0 },
            }}
          >
            <Typography component="dt" variant="body2" color="text.secondary">
              {row.label}
            </Typography>
            <Typography
              component="dd"
              variant="body2"
              sx={{ m: 0, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}
            >
              {row.value}
              {row.brandScale && (
                <Tooltip title={note}>
                  <Box
                    component="span"
                    tabIndex={0}
                    aria-label={t('market.brandScale')}
                    aria-describedby={`${id}-note`}
                    sx={{ ml: 0.5, color: 'text.secondary', cursor: 'help' }}
                  >
                    *
                  </Box>
                </Tooltip>
              )}
            </Typography>
          </Box>
        ))}
      </Box>
      {scaled && (
        <Typography
          id={`${id}-note`}
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 1 }}
        >
          {`* ${note}`}
        </Typography>
      )}
      {collapsed && !all && rows.length > COLLAPSED_ROWS && (
        <Button
          onClick={() => {
            setAll(true);
          }}
          sx={{ mt: 1, minHeight: 44 }}
        >
          {fill(t('market.product.allAttributes'), { count: String(rows.length) })}
        </Button>
      )}
    </Box>
  );
}
