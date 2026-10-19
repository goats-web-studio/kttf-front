import {
  PRODUCT_CATEGORIES,
  catalogImageVariant,
  productCategorySchema,
  type AdminProductListItemView,
  type ProductCategory,
} from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useCallback, type ReactNode } from 'react';

import { isMissingResource, queryString } from '@/common/api';
import { useT } from '@/common/i18n';
import { orUndefined } from '@/common/search';
import EmptyState from '@/common/ui/empty-state';
import Pagination from '@/common/ui/pagination';
import QueryState from '@/common/ui/query-state';
import SearchInput from '@/common/ui/search-input';
import { RowsSkeleton } from '@/common/ui/skeleton';

import { CATEGORY_ICONS, categoryLabel } from '../labels';
import { adminProductQuery, adminProductsQuery, brandsQuery } from '../queries';
import ProductEditor from './product-editor';

const PAGE_SIZE = 20;

export interface ProductsAdminSearch {
  readonly q?: string | undefined;
  readonly category?: ProductCategory | undefined;
  readonly page?: number | undefined;
  /** Идентификатор товара в правке или `new` — новый. */
  readonly edit?: string | undefined;
}

/**
 * Товары каталога — `docs/10` 5.8: поиск, фильтр по категории, список со
 * скрытыми, правка карточки. Правка открывается адресом `?edit=`, чтобы
 * ссылкой со страницы товара попасть прямо в его карточку.
 */
export default function ProductsAdmin({
  search,
  onSearch,
}: {
  readonly search: ProductsAdminSearch;
  readonly onSearch: (patch: ProductsAdminSearch, replace?: boolean) => void;
}): ReactNode {
  const t = useT();
  const brands = useQuery(brandsQuery);
  const commitQ = useCallback(
    (value: string) => {
      onSearch({ q: orUndefined(value), page: undefined }, true);
    },
    [onSearch],
  );

  if (search.edit !== undefined) {
    return (
      <Editor id={search.edit} defaultCategory={search.category ?? 'BLADE'} onSearch={onSearch} />
    );
  }

  const page = search.page ?? 1;

  return (
    <Box sx={{ mt: 3 }}>
      <Box
        role="search"
        sx={{
          display: 'grid',
          gap: 2,
          alignItems: 'center',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '2fr 1fr auto' },
        }}
      >
        <SearchInput label={t('catalog.products.search')} value={search.q} onCommit={commitQ} />
        <TextField
          select
          label={t('catalog.form.category')}
          value={search.category ?? ''}
          onChange={(event) => {
            const parsed = productCategorySchema.safeParse(event.target.value);
            onSearch({ category: parsed.success ? parsed.data : undefined, page: undefined });
          }}
        >
          <MenuItem value="">{t('catalog.products.allCategories')}</MenuItem>
          {PRODUCT_CATEGORIES.map((category) => (
            <MenuItem key={category} value={category}>
              {t(categoryLabel(category))}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="contained"
          startIcon={<Plus size={18} aria-hidden />}
          disabled={(brands.data ?? []).length === 0}
          onClick={() => {
            onSearch({ edit: 'new' });
          }}
          sx={{ minHeight: 48 }}
        >
          {t('catalog.products.add')}
        </Button>
      </Box>
      {brands.data?.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t('catalog.products.needBrand')}
        </Typography>
      )}

      <List search={search} page={page} onSearch={onSearch} />
    </Box>
  );
}

function List({
  search,
  page,
  onSearch,
}: {
  readonly search: ProductsAdminSearch;
  readonly page: number;
  readonly onSearch: (patch: ProductsAdminSearch) => void;
}): ReactNode {
  const t = useT();
  const products = useQuery(
    adminProductsQuery(
      queryString({
        category: search.category,
        search: search.q,
        sort: 'new',
        page,
        limit: PAGE_SIZE,
      }),
    ),
  );
  const pages =
    products.data === undefined ? 1 : Math.max(1, Math.ceil(products.data.total / PAGE_SIZE));

  return (
    <Box sx={{ mt: 3 }}>
      <QueryState
        isPending={products.isPending}
        error={products.error}
        onRetry={() => void products.refetch()}
        loading={<RowsSkeleton />}
      >
        {(products.data?.items ?? []).length === 0 ? (
          <EmptyState title={t('catalog.products.empty')} />
        ) : (
          <Paper variant="outlined" component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
            {(products.data?.items ?? []).map((item) => (
              <Row
                key={item.id}
                item={item}
                onEdit={() => {
                  onSearch({ edit: item.id });
                }}
              />
            ))}
          </Paper>
        )}
      </QueryState>
      <Pagination
        page={page}
        pages={pages}
        onPage={(next) => {
          onSearch({ page: next === 1 ? undefined : next });
        }}
      />
    </Box>
  );
}

function Row({
  item,
  onEdit,
}: {
  readonly item: AdminProductListItemView;
  readonly onEdit: () => void;
}): ReactNode {
  const t = useT();
  const Icon = CATEGORY_ICONS[item.category];
  const hidden = item.hidden;

  return (
    <Box
      component="li"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: { xs: 2, sm: 3 },
        py: 1.5,
        borderTop: 1,
        borderColor: 'divider',
        '&:first-of-type': { borderTop: 0 },
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          flexShrink: 0,
          borderRadius: 2,
          overflow: 'hidden',
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'var(--ink-100)',
          color: 'var(--ink-500)',
        }}
      >
        {item.image === null ? (
          <Icon size={20} aria-hidden />
        ) : (
          <Box
            component="img"
            src={catalogImageVariant(item.image.url, 240)}
            width={48}
            height={48}
            alt=""
            loading="lazy"
            sx={{
              display: 'block',
              width: 48,
              height: 48,
              objectFit: 'contain',
              bgcolor: 'var(--paper)',
            }}
          />
        )}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {`${item.brand.name} · ${t(categoryLabel(item.category))}`}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Link
            component="button"
            type="button"
            onClick={onEdit}
            sx={{ fontWeight: 600, textAlign: 'left', py: 0.5 }}
          >
            {item.name}
          </Link>
          {hidden && <Badge tone="warn">{t('catalog.products.hidden')}</Badge>}
          {item.status === 'PENDING' && (
            <Badge tone="neutral">{t('catalog.products.pending')}</Badge>
          )}
        </Box>
      </Box>
      <Button
        onClick={onEdit}
        sx={{ minHeight: 44, flexShrink: 0, display: { xs: 'none', sm: 'inline-flex' } }}
      >
        {t('catalog.products.edit')}
      </Button>
    </Box>
  );
}

function Badge({
  tone,
  children,
}: {
  readonly tone: 'warn' | 'neutral';
  readonly children: string;
}): ReactNode {
  return (
    <Box
      component="span"
      sx={{
        px: 1,
        height: 24,
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        typography: 'caption',
        fontWeight: 600,
        bgcolor: tone === 'warn' ? 'var(--warn-50)' : 'var(--ink-100)',
        color: tone === 'warn' ? 'var(--warn-text)' : 'var(--ink-700)',
      }}
    >
      {children}
    </Box>
  );
}

/** Карточка в правке: новый товар — сразу, существующий — после загрузки. */
function Editor({
  id,
  defaultCategory,
  onSearch,
}: {
  readonly id: string;
  readonly defaultCategory: ProductCategory;
  readonly onSearch: (patch: ProductsAdminSearch, replace?: boolean) => void;
}): ReactNode {
  const t = useT();
  const brands = useQuery(brandsQuery);
  const isNew = id === 'new';
  // Через администрирование: публичная карточка скрытого товара не отдаёт.
  const product = useQuery({ ...adminProductQuery(id), enabled: !isNew });
  const close = (): void => {
    onSearch({ edit: undefined });
  };

  if (!isNew && isMissingResource(product.error)) {
    return (
      <Box sx={{ mt: 3 }}>
        <EmptyState
          title={t('market.product.notFound')}
          text={t('catalog.products.notFoundText')}
          action={<Button onClick={close}>{t('catalog.form.close')}</Button>}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <QueryState
        isPending={brands.isPending || (!isNew && product.isPending)}
        error={brands.error ?? (isNew ? null : product.error)}
        loading={<RowsSkeleton />}
      >
        <ProductEditor
          key={isNew ? 'new' : (product.data?.id ?? id)}
          product={isNew ? null : (product.data ?? null)}
          brands={brands.data ?? []}
          hidden={product.data?.hidden}
          defaultCategory={defaultCategory}
          onSaved={(saved) => {
            if (isNew) onSearch({ edit: saved.id }, true);
          }}
          onClose={close}
        />
      </QueryState>
    </Box>
  );
}
