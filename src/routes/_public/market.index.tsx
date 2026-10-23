import { PRODUCT_CATEGORIES, type BrandView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { z } from 'zod';

import { queryString } from '@/common/api';
import { fill, useT } from '@/common/i18n';
import AdSlot from '@/common/ui/ad-slot';
import EmptyState from '@/common/ui/empty-state';
import FilterSummary from '@/common/ui/filter-summary';
import QueryState from '@/common/ui/query-state';
import BrandMark from '@/features/market/brand-mark';
import { catalogApiQuery, parseCatalogSearch } from '@/features/market/catalog-search';
import { categoryHref, categoryLabel } from '@/features/market/labels';
import MarketSection, { CATALOG_PAGE_SIZE } from '@/features/market/market-section';
import PlayersChoice from '@/features/market/players-choice';
import { CHOICE_BANDS, CHOICE_PICKS } from '@/features/market/players-choice-query';
import ProductGrid, { ProductGridSkeleton, ProductResults } from '@/features/market/product-grid';
import ProductSearch from '@/features/market/product-search';
import { brandsQuery, productsQuery } from '@/features/market/queries';

/** Вкладка и планка «Выбора игроков» — в адресе, как фильтры списка (07, 6.2). */
const choiceSchema = z.object({
  pick: z.enum(CHOICE_PICKS).optional().catch(undefined),
  band: z.enum(CHOICE_BANDS).optional().catch(undefined),
});

export const Route = createFileRoute('/_public/market/')({
  validateSearch: (search: Record<string, unknown>) => ({
    ...parseCatalogSearch(null, search),
    ...choiceSchema.parse(search),
  }),
  component: MarketPage,
});

/** «Популярное» — 12 товаров (`docs/10` 5.2), «Новое» — два ряда плитки. */
const POPULAR = 12;
const NEWEST = 8;
/** Производителей в ленте; остальные — «Все производители». */
const BRANDS = 12;

/**
 * Главная маркета — `docs/10` 5.2.
 *
 * Поиск сверху, категории плитками, «Выбор игроков Казахстана» (по числу
 * игроков с планкой рейтинга, M1.2), популярное по просмотрам, новое,
 * производители, слот рекламы. Скидки и магазины придут с магазинами (M1.3)
 * и пустыми местами здесь не стоят (ADR-042).
 *
 * Поиск с Enter показывает результаты здесь же, адресом `?q=`: ссылку на
 * поиск можно переслать, как подборку категории.
 */
function MarketPage(): ReactNode {
  const t = useT();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <Typography variant="h1">{t('page.market.title')}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 680 }}>
        {t('market.lead')}
      </Typography>

      <Box role="search" sx={{ mt: 3, maxWidth: { md: 720 } }}>
        <ProductSearch
          key={search.q ?? ''}
          initial={search.q ?? ''}
          onPick={(product) => {
            void navigate({ to: '/market/items/$slug', params: { slug: product.slug } });
          }}
          onSubmit={(text) => {
            void navigate({ search: text === '' ? {} : { q: text } });
          }}
        />
      </Box>

      {search.q === undefined ? <Showcase /> : <Results q={search.q} page={search.page ?? 1} />}
    </Container>
  );
}

function Results({ q, page }: { readonly q: string; readonly page: number }): ReactNode {
  const t = useT();
  const navigate = Route.useNavigate();
  const products = useQuery(
    productsQuery(catalogApiQuery(undefined, { q, page }, CATALOG_PAGE_SIZE)),
  );
  const reset = (): void => {
    void navigate({ search: {} });
  };

  return (
    <>
      <FilterSummary
        total={products.isError ? null : products.data?.total}
        filters={[{ key: 'q', label: fill(t('filter.chipQuoted'), { value: q }), onRemove: reset }]}
        onReset={reset}
      />
      <Box sx={{ mt: 2 }}>
        <ProductResults
          result={products}
          page={page}
          onPage={(next) => {
            void navigate({
              search: (previous) => ({ ...previous, page: next === 1 ? undefined : next }),
            });
          }}
          empty={
            <EmptyState
              title={t('market.notFound.title')}
              text={t('market.search.notFoundText')}
              action={<Button onClick={reset}>{t('market.search.reset')}</Button>}
            />
          }
        />
      </Box>
    </>
  );
}

function Showcase(): ReactNode {
  const t = useT();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const popular = useQuery(
    productsQuery(queryString({ sort: 'popular', page: 1, limit: POPULAR })),
  );
  const newest = useQuery(productsQuery(queryString({ sort: 'new', page: 1, limit: NEWEST })));
  const brands = useQuery(brandsQuery);
  const empty = popular.data?.total === 0;

  return (
    <>
      <MarketSection title={t('market.categories')}>
        <Categories />
      </MarketSection>

      {empty ? (
        <Box sx={{ mt: 6 }}>
          <EmptyState title={t('market.empty.title')} text={t('market.empty.text')} />
        </Box>
      ) : (
        <>
          <MarketSection title={t('market.choice.title')}>
            <PlayersChoice
              pick={search.pick ?? 'BLADE'}
              band={search.band ?? 'all'}
              onChange={(next) => {
                void navigate({
                  search: {
                    pick: next.pick === 'BLADE' ? undefined : next.pick,
                    band: next.band === 'all' ? undefined : next.band,
                  },
                  replace: true,
                  resetScroll: false,
                });
              }}
            />
          </MarketSection>

          <MarketSection title={t('market.popular')}>
            <QueryState
              isPending={popular.isPending}
              error={popular.error}
              onRetry={() => void popular.refetch()}
              loading={<ProductGridSkeleton count={4} />}
            >
              <ProductGrid products={popular.data?.items ?? []} />
            </QueryState>
          </MarketSection>

          {(newest.data?.items.length ?? 0) > 0 && (
            <MarketSection title={t('market.new')}>
              <ProductGrid products={newest.data?.items ?? []} />
            </MarketSection>
          )}
        </>
      )}

      {(brands.data?.length ?? 0) > 0 && (
        <MarketSection
          title={t('market.brands')}
          more={{ href: '/market/brands', label: t('market.brands.all') }}
        >
          <BrandStrip brands={brands.data ?? []} />
        </MarketSection>
      )}

      <AdSlot placement="market-inline" />
    </>
  );
}

/**
 * Категории — указатель: названия пилюлями в строку, без иконок и теней.
 * Все двенадцать — и пустые: каталог наполняется импортом. Двенадцать
 * одинаковых плиток с красной иконкой читались как витрина шаблона, а не
 * каталога; указателю достаточно слов.
 */
function Categories(): ReactNode {
  const t = useT();

  return (
    <Box
      component="ul"
      sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 1 }}
    >
      {PRODUCT_CATEGORIES.map((category) => (
        <Box component="li" key={category}>
          <ButtonBase
            href={categoryHref(category)}
            sx={{
              minHeight: 44,
              px: 2,
              borderRadius: 999,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'var(--line-strong)',
              fontWeight: 600,
              fontSize: 15,
              transition:
                'border-color var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease)',
              '@media (hover: hover)': {
                '&:hover': { borderColor: 'var(--ink-700)', color: 'var(--red-600)' },
              },
              '&.Mui-focusVisible': { outline: '2px solid var(--red-600)', outlineOffset: '2px' },
            }}
          >
            {t(categoryLabel(category))}
          </ButtonBase>
        </Box>
      ))}
    </Box>
  );
}

/** Производители лентой: сначала те, у кого больше товаров. */
function BrandStrip({ brands }: { readonly brands: readonly BrandView[] }): ReactNode {
  const size = (brand: BrandView): number =>
    Object.values(brand.counts).reduce((sum, count) => sum + count, 0);
  const top = [...brands].sort((a, b) => size(b) - size(a)).slice(0, BRANDS);

  return (
    <Box
      component="ul"
      sx={{
        m: 0,
        p: 0,
        listStyle: 'none',
        display: 'flex',
        gap: 1,
        overflowX: 'auto',
        overscrollBehaviorX: 'contain',
        pb: 1,
      }}
    >
      {top.map((brand) => (
        <Box component="li" key={brand.id} sx={{ flexShrink: 0 }}>
          <ButtonBase
            href={`/market/brands/${brand.slug}`}
            sx={{
              flexDirection: 'column',
              gap: 1,
              width: 112,
              minHeight: 112,
              p: 1.5,
              borderRadius: 4,
              '@media (hover: hover)': { '&:hover': { bgcolor: 'var(--paper-hover)' } },
              '&.Mui-focusVisible': { outline: '2px solid var(--red-600)', outlineOffset: '2px' },
            }}
          >
            <BrandMark brand={brand} size={56} />
            <Typography
              component="span"
              variant="body2"
              sx={{ fontWeight: 600, textAlign: 'center' }}
            >
              {brand.name}
            </Typography>
          </ButtonBase>
        </Box>
      ))}
    </Box>
  );
}
