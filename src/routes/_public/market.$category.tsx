import { categoryBySlug, type ProductCategory } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo, type ReactNode } from 'react';

import { useLocale, useT, type MessageKey } from '@/common/i18n';
import EmptyState from '@/common/ui/empty-state';
import FilterSummary from '@/common/ui/filter-summary';
import { BackLink } from '@/common/ui/page-header';
import { filterChips } from '@/features/market/active-filters';
import CatalogFilter from '@/features/market/catalog-filter';
import {
  CATALOG_SORTS,
  brandsOf,
  catalogApiQuery,
  draftFromSearch,
  parseCatalogSearch,
  parseLooseCatalogSearch,
  searchFromDraft,
  type CatalogSearch,
  type CatalogSort,
} from '@/features/market/catalog-search';
import { categoryLabel } from '@/features/market/labels';
import { CATALOG_PAGE_SIZE } from '@/features/market/market-section';
import { ProductResults } from '@/features/market/product-grid';
import { brandsQuery, productsQuery } from '@/features/market/queries';

export const Route = createFileRoute('/_public/market/$category')({
  validateSearch: parseLooseCatalogSearch,
  component: CategoryPage,
});

const SORT_LABELS: Readonly<Record<CatalogSort, MessageKey>> = {
  popular: 'market.sort.popular',
  name: 'market.sort.name',
  new: 'market.sort.new',
};

/**
 * Список категории — `docs/10` 5.3: `/market/blades`, `/market/rubbers` …
 *
 * Неизвестная категория — «не найдено» с дорогой в маркет, а не пустой
 * список: ссылку могли обрезать в мессенджере.
 */
function CategoryPage(): ReactNode {
  const t = useT();
  const { category: slug } = Route.useParams();
  const category = categoryBySlug(slug);

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <BackLink href="/market" label={t('nav.market')} />
      {category === null ? (
        <>
          <Typography variant="h1" sx={{ mt: 1, mb: 3 }}>
            {t('market.categoryNotFound.title')}
          </Typography>
          <EmptyState
            title={t('market.categoryNotFound.text')}
            action={<Button href="/market">{t('market.categoryNotFound.action')}</Button>}
          />
        </>
      ) : (
        <Category category={category} />
      )}
    </Container>
  );
}

function Category({ category }: { readonly category: ProductCategory }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const navigate = Route.useNavigate();
  const loose = Route.useSearch();
  const search = useMemo(() => parseCatalogSearch(category, loose), [category, loose]);
  const brands = useQuery(brandsQuery);
  const products = useQuery(productsQuery(catalogApiQuery(category, search, CATALOG_PAGE_SIZE)));

  const page = search.page ?? 1;
  const selected = brandsOf(search);
  // В выборе — производители этой категории и уже выбранные по ссылке.
  const choices = (brands.data ?? []).filter(
    (brand) => (brand.counts[category] ?? 0) > 0 || selected.includes(brand.id),
  );
  const go = (next: CatalogSearch): void => {
    void navigate({ search: next });
  };
  const chips = filterChips(category, search, brands.data ?? [], t, locale).map((chip) => ({
    key: chip.key,
    label: chip.label,
    onRemove: () => {
      go({ ...search, ...chip.remove, page: undefined });
    },
  }));
  const reset = (): void => {
    go(search.sort === undefined ? {} : { sort: search.sort });
  };
  const draft = draftFromSearch(category, search);

  return (
    <>
      <Typography variant="h1" sx={{ mt: 1 }}>
        {t(categoryLabel(category))}
      </Typography>

      {/* Ключ — условия из адреса: снятый чип или «Назад» заново заполняют поля. */}
      <CatalogFilter
        key={JSON.stringify(draft)}
        category={category}
        initial={draft}
        brands={choices}
        onSubmit={(next) => {
          go(searchFromDraft(category, next, search.sort));
        }}
      />

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        useFlexGap
        spacing={2}
        sx={{ mt: 1, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Box sx={{ minWidth: 0 }}>
          <FilterSummary
            total={products.isError ? null : products.data?.total}
            filters={chips}
            onReset={reset}
          />
        </Box>
        <TextField
          select
          size="small"
          label={t('market.sort.label')}
          value={search.sort ?? 'popular'}
          onChange={(event) => {
            const value = CATALOG_SORTS.find((sort) => sort === event.target.value);
            go({
              ...search,
              sort: value === undefined || value === 'popular' ? undefined : value,
              page: undefined,
            });
          }}
          sx={{
            mt: { sm: 2 },
            minWidth: 200,
            flexShrink: 0,
            '& .MuiInputBase-root': { minHeight: 44 },
          }}
        >
          {CATALOG_SORTS.map((sort) => (
            <MenuItem key={sort} value={sort} sx={{ minHeight: 44 }}>
              {t(SORT_LABELS[sort])}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Box sx={{ mt: 2 }}>
        <ProductResults
          result={products}
          page={page}
          onPage={(next) => {
            go({ ...search, page: next === 1 ? undefined : next });
          }}
          empty={
            chips.length > 0 ? (
              <EmptyState
                title={t('market.notFound.title')}
                text={t('market.notFound.text')}
                action={<Button onClick={reset}>{t('filter.resetAll')}</Button>}
              />
            ) : (
              <EmptyState title={t('market.categoryEmpty.title')} text={t('market.empty.text')} />
            )
          }
        />
      </Box>
    </>
  );
}
