import type { ReactNode } from 'react';

import { formatCount, useLocale, useT } from '@/common/i18n';

import Button from './button';

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
 * а общее число страниц видно всегда.
 */
export default function Pagination({ page, pages, onPage }: PaginationProps): ReactNode {
  const t = useT();
  const locale = useLocale();

  if (pages <= 1) {
    return null;
  }

  return (
    <nav
      aria-label={t('common.pagination')}
      className="mt-6 flex items-center justify-between gap-4"
    >
      <Button
        size="sm"
        disabled={page <= 1}
        onClick={() => {
          onPage(page - 1);
        }}
      >
        {t('common.prev')}
      </Button>
      <span className="text-sm tabular-nums text-ink-700" aria-current="page">
        {t('common.page')} {formatCount(page, locale)} {t('common.of')} {formatCount(pages, locale)}
      </span>
      <Button
        size="sm"
        disabled={page >= pages}
        onClick={() => {
          onPage(page + 1);
        }}
      >
        {t('common.next')}
      </Button>
    </nav>
  );
}
