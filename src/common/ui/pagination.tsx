import MuiPagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

interface PaginationProps {
  readonly page: number;
  readonly pages: number;
  readonly onPage: (page: number) => void;
}

/**
 * Постраничная навигация — docs/07-design-system.md, 6.3.
 *
 * Не бесконечный скролл (запрет №9): игрок возвращается на своё место в
 * рейтинге и делится ссылкой на него, поэтому номер страницы — часть адреса,
 * а общее число страниц видно всегда. Кнопки 44px — зона нажатия (раздел 9).
 */
export default function Pagination({ page, pages, onPage }: PaginationProps): ReactNode {
  const t = useT();

  if (pages <= 1) {
    return null;
  }

  return (
    <Stack sx={{ mt: 3, alignItems: 'center' }}>
      <MuiPagination
        page={page}
        count={pages}
        shape="rounded"
        variant="outlined"
        siblingCount={0}
        aria-label={t('common.pagination')}
        onChange={(_, next) => {
          onPage(next);
        }}
        // Подписи кнопок — через словарь, а не английские умолчания MUI.
        getItemAriaLabel={(type, item) =>
          type === 'page'
            ? `${t('common.page')} ${String(item)}`
            : type === 'previous'
              ? t('common.prev')
              : t('common.next')
        }
        sx={{ '& .MuiPaginationItem-root': { minWidth: 44, height: 44 } }}
      />
    </Stack>
  );
}
