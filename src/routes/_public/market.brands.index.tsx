import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import EmptyState from '@/common/ui/empty-state';
import { BackLink } from '@/common/ui/page-header';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import BrandCounts from '@/features/market/brand-counts';
import BrandMark from '@/features/market/brand-mark';
import { brandsQuery } from '@/features/market/queries';

export const Route = createFileRoute('/_public/market/brands/')({
  component: BrandsPage,
});

/** Производители — `docs/10` 3.1: логотип, страна, товары по категориям. */
function BrandsPage(): ReactNode {
  const t = useT();
  const brands = useQuery(brandsQuery);
  const list = [...(brands.data ?? [])].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <BackLink href="/market" label={t('nav.market')} />
      <Typography variant="h1" sx={{ mt: 1 }}>
        {t('market.brands')}
      </Typography>

      <Box sx={{ mt: 3 }}>
        <QueryState
          isPending={brands.isPending}
          error={brands.error}
          onRetry={() => void brands.refetch()}
          loading={<RowsSkeleton />}
        >
          {list.length === 0 ? (
            <EmptyState title={t('market.brands.empty')} />
          ) : (
            <Box
              component="ul"
              sx={{
                m: 0,
                p: 0,
                listStyle: 'none',
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
              }}
            >
              {list.map((brand) => (
                <Paper
                  key={brand.id}
                  variant="outlined"
                  component="li"
                  sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', gap: 2, alignItems: 'flex-start' }}
                >
                  <BrandMark brand={brand} size={56} />
                  <Box sx={{ minWidth: 0 }}>
                    <Link
                      href={`/market/brands/${brand.slug}`}
                      color="text.primary"
                      variant="h3"
                      sx={{ display: 'inline-block', py: 0.5 }}
                    >
                      {brand.name}
                    </Link>
                    {brand.country !== null && (
                      <Typography variant="body2" color="text.secondary">
                        {brand.country}
                      </Typography>
                    )}
                    <Box sx={{ mt: 1.5 }}>
                      <BrandCounts brand={brand} />
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </QueryState>
      </Box>
    </Container>
  );
}
