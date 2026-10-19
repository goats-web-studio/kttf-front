import type { BrandView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';
import { z } from 'zod';

import { isMissingResource } from '@/common/api';
import { useT } from '@/common/i18n';
import { searchPage } from '@/common/search';
import EmptyState from '@/common/ui/empty-state';
import { BackLink } from '@/common/ui/page-header';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import BrandCounts from '@/features/market/brand-counts';
import BrandMark from '@/features/market/brand-mark';
import { catalogApiQuery } from '@/features/market/catalog-search';
import { CATALOG_PAGE_SIZE } from '@/features/market/market-section';
import { ProductResults } from '@/features/market/product-grid';
import { brandQuery, productsQuery } from '@/features/market/queries';

const searchSchema = z.object({ page: searchPage });

export const Route = createFileRoute('/_public/market/brands/$slug')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: BrandPage,
});

/** Страница производителя — `docs/10` 3.1: шапка и его товары тем же списком, что у категории. */
function BrandPage(): ReactNode {
  const t = useT();
  const { slug } = Route.useParams();
  const brand = useQuery(brandQuery(slug));

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <BackLink href="/market/brands" label={t('market.brands')} />
      {isMissingResource(brand.error) ? (
        <Typography variant="h1" sx={{ mt: 1 }}>
          {t('market.brand.notFound')}
        </Typography>
      ) : (
        <QueryState
          isPending={brand.isPending}
          error={brand.error}
          onRetry={() => void brand.refetch()}
          loading={<RowsSkeleton />}
        >
          {brand.data !== undefined && <BrandDetails brand={brand.data} />}
        </QueryState>
      )}
    </Container>
  );
}

function BrandDetails({ brand }: { readonly brand: BrandView }): ReactNode {
  const t = useT();
  const navigate = Route.useNavigate();
  const page = Route.useSearch().page ?? 1;
  const products = useQuery(
    productsQuery(catalogApiQuery(undefined, { brand: brand.id, page }, CATALOG_PAGE_SIZE)),
  );

  return (
    <>
      <Paper variant="outlined" component="header" sx={{ mt: 1, p: { xs: 2.5, sm: 4 } }}>
        <Stack direction="row" spacing={2.5} sx={{ alignItems: 'center', minWidth: 0 }}>
          <BrandMark brand={brand} size={72} />
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h1"
              sx={{ fontSize: { xs: 28, sm: 36 }, lineHeight: { xs: '32px', sm: '40px' } }}
            >
              {brand.name}
            </Typography>
            {brand.country !== null && (
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                {brand.country}
              </Typography>
            )}
            {brand.website !== null && (
              <Link
                href={brand.website}
                target="_blank"
                rel="noopener noreferrer"
                variant="body2"
                sx={{ mt: 0.5, py: 1, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
              >
                {t('market.brand.website')}
                <ExternalLink size={14} aria-hidden />
              </Link>
            )}
          </Box>
        </Stack>
        <Box sx={{ mt: 2 }}>
          <BrandCounts brand={brand} />
        </Box>
      </Paper>

      <Typography variant="h2" sx={{ mt: 6, mb: 2 }}>
        {t('market.brand.products')}
      </Typography>
      <ProductResults
        result={products}
        page={page}
        onPage={(next) => {
          void navigate({ search: { page: next === 1 ? undefined : next } });
        }}
        empty={
          <EmptyState
            title={t('market.brand.empty')}
            action={<Button href="/market">{t('market.categoryNotFound.action')}</Button>}
          />
        }
      />
    </>
  );
}
