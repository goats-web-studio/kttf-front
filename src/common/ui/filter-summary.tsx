import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { formatCount, useLocale, useT } from '@/common/i18n';

export interface ActiveFilter {
  readonly key: string;
  /** «Город: Алматы» — подпись и значение, чтобы чип читался без панели. */
  readonly label: string;
  readonly onRemove: () => void;
}

interface FilterSummaryProps {
  /**
   * Сколько нашлось. `undefined` — ответа ещё нет, `null` — запрос отказал,
   * и считать нечего: вечная заготовка на месте числа выглядела бы загрузкой.
   */
  readonly total: number | null | undefined;
  readonly filters: readonly ActiveFilter[];
  readonly onReset: () => void;
}

/**
 * Строка под панелью фильтров — docs/07-design-system.md, 6.2.
 *
 * Число найденного видно всегда, активные фильтры — чипами с крестиком,
 * рядом «Сбросить все». Чип снимает одно условие, не трогая остальные:
 * крестиком или клавишей Delete, когда чип в фокусе.
 */
export default function FilterSummary({ total, filters, onReset }: FilterSummaryProps): ReactNode {
  const t = useT();
  const locale = useLocale();

  return (
    <Stack
      direction="row"
      useFlexGap
      spacing={1}
      sx={{ mt: 2, flexWrap: 'wrap', alignItems: 'center' }}
    >
      {total !== null && (
        <Typography variant="body2" color="text.secondary" aria-live="polite" sx={{ mr: 1 }}>
          {t('filter.found')}{' '}
          <Typography
            component="span"
            variant="body2"
            color="text.primary"
            sx={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}
          >
            {total === undefined ? (
              <Skeleton component="span" width={32} sx={{ display: 'inline-block' }} />
            ) : (
              formatCount(total, locale)
            )}
          </Typography>
        </Typography>
      )}

      {filters.map((filter) => (
        <Chip
          key={filter.key}
          label={filter.label}
          variant="outlined"
          onDelete={filter.onRemove}
        />
      ))}

      {filters.length > 0 && (
        <Button variant="text" size="small" onClick={onReset}>
          {t('filter.resetAll')}
        </Button>
      )}
    </Stack>
  );
}
