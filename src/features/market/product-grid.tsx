import type { Page, ProductListItemView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import { Fragment, type ReactNode } from 'react';

import AdSlot from '@/common/ui/ad-slot';
import Pagination from '@/common/ui/pagination';
import QueryState from '@/common/ui/query-state';

import ProductCard, { ProductCardSkeleton } from './product-card';

/** После какой карточки стоит рекламный слот (`docs/10` 5.9). */
export const AD_AFTER = 8;

/** Сколько карточек грузится сразу: первый экран на десктопе — два ряда по четыре. */
const EAGER = 4;

const GRID = {
  m: 0,
  p: 0,
  listStyle: 'none',
  display: 'grid',
  gap: { xs: 1.5, sm: 2 },
  gridTemplateColumns: {
    xs: 'repeat(2, minmax(0, 1fr))',
    sm: 'repeat(3, minmax(0, 1fr))',
    md: 'repeat(4, minmax(0, 1fr))',
  },
} as const;

/** Плитка товаров. Слот рекламы — карточкой после восьмой, если задан. */
export default function ProductGrid({
  products,
  withAd = false,
}: {
  readonly products: readonly ProductListItemView[];
  readonly withAd?: boolean;
}): ReactNode {
  return (
    <Box component="ul" sx={GRID}>
      {products.map((product, index) => (
        <Fragment key={product.id}>
          <Box component="li" sx={{ minWidth: 0 }}>
            <ProductCard product={product} eager={index < EAGER} />
          </Box>
          {withAd && index === AD_AFTER - 1 && <AdSlot placement="market-inline" />}
        </Fragment>
      ))}
    </Box>
  );
}

export function ProductGridSkeleton({ count = 8 }: { readonly count?: number }): ReactNode {
  return (
    <Box sx={GRID} role="status">
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </Box>
  );
}

interface ProductResultsProps {
  readonly result: {
    readonly data: Page<ProductListItemView> | undefined;
    readonly isPending: boolean;
    readonly error: unknown;
    readonly refetch: () => unknown;
  };
  readonly page: number;
  readonly onPage: (page: number) => void;
  /** Что показать, когда список пуст: «ничего не найдено» или «пока пусто». */
  readonly empty: ReactNode;
}

/**
 * Список товаров с номерами страниц — у RTTF бесконечная прокрутка без
 * адресов страниц, у нас страница — часть адреса (`docs/10` 5.3).
 */
export function ProductResults({ result, page, onPage, empty }: ProductResultsProps): ReactNode {
  const pages =
    result.data === undefined ? 1 : Math.max(1, Math.ceil(result.data.total / result.data.limit));

  return (
    <>
      <QueryState
        isPending={result.isPending}
        error={result.error}
        onRetry={() => void result.refetch()}
        loading={<ProductGridSkeleton />}
      >
        {result.data === undefined ? null : result.data.items.length > 0 ? (
          <ProductGrid products={result.data.items} withAd />
        ) : (
          empty
        )}
      </QueryState>
      <Pagination page={page} pages={pages} onPage={onPage} />
    </>
  );
}
