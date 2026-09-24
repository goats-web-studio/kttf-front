import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

/**
 * Строки списка или таблицы на время загрузки — docs/07-design-system.md,
 * раздел 7. Пять — по тому же разделу.
 *
 * Повторяют форму того, что придёт, а не крутят спиннер: страница не
 * прыгает, когда данные приходят. Пульсация глушится общим правилом
 * `prefers-reduced-motion` в `styles.css`.
 */
export function RowsSkeleton({ rows = 5 }: { readonly rows?: number }): ReactNode {
  const t = useT();

  return (
    <Box role="status" aria-label={t('common.loading')}>
      {Array.from({ length: rows }, (_, index) => (
        <Box
          key={index}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            py: 1.5,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Skeleton variant="rounded" width={48} height={48} />
          <Box sx={{ flex: 1 }}>
            <Skeleton width="50%" />
            <Skeleton width="30%" />
          </Box>
          <Skeleton width={48} />
        </Box>
      ))}
    </Box>
  );
}
