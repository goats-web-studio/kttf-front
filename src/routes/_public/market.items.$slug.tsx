import type { ProductView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Settings } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

import { isMissingResource } from '@/common/api';
import { fill, formatCount, useLocale, useT } from '@/common/i18n';
import AdSlot from '@/common/ui/ad-slot';
import { BackLink } from '@/common/ui/page-header';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { useSessionStore } from '@/features/auth/session-store';
import { attributeRows } from '@/features/market/attribute-rows';
import AttributeTable from '@/features/market/attribute-table';
import { categoryHref, categoryLabel, hasOptions } from '@/features/market/labels';
import ProductGallery from '@/features/market/product-gallery';
import ProductOptions from '@/features/market/product-options';
import { productQuery } from '@/features/market/queries';
import { trackProductView } from '@/features/market/track';

import WhereStands from './-market/where-stands';
import WhoPlays from './-market/who-plays';

export const Route = createFileRoute('/_public/market/items/$slug')({
  component: ProductPage,
});

/**
 * Товар — `docs/10` 5.4, 5.5.
 *
 * Справочник: фото, характеристики, варианты, описание, «Кто играет» с
 * «Играю» и «Где стоит» (M1.1–M1.2). «Где купить» и «Заказать» придут с
 * магазинами (M1.3–M1.4); пустых мест под них нет (ADR-042).
 */
function ProductPage(): ReactNode {
  const t = useT();
  const { slug } = Route.useParams();
  const product = useQuery(productQuery(slug));

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      {isMissingResource(product.error) ? (
        <>
          <BackLink href="/market" label={t('nav.market')} />
          <Typography variant="h1" sx={{ mt: 1 }}>
            {t('market.product.notFound')}
          </Typography>
          <Button href="/market" sx={{ mt: 3 }}>
            {t('market.categoryNotFound.action')}
          </Button>
        </>
      ) : (
        <QueryState
          isPending={product.isPending}
          error={product.error}
          onRetry={() => void product.refetch()}
          loading={<RowsSkeleton />}
        >
          {product.data !== undefined && <ProductDetails product={product.data} />}
        </QueryState>
      )}
    </Container>
  );
}

function ProductDetails({ product }: { readonly product: ProductView }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const user = useSessionStore((state) => state.user);

  useEffect(() => {
    trackProductView(product.id);
  }, [product.id]);

  const category = t(categoryLabel(product.category));
  const hasAttributes = attributeRows(product.category, product.attrs, t, locale).length > 0;

  const crumbs = (
    <Breadcrumbs aria-label={t('market.breadcrumbs')} sx={{ typography: 'body2', mb: 2 }}>
      <Link href="/market" color="text.secondary" sx={{ py: 1, display: 'inline-block' }}>
        {t('nav.market')}
      </Link>
      <Link
        href={categoryHref(product.category)}
        color="text.secondary"
        sx={{ py: 1, display: 'inline-block' }}
      >
        {category}
      </Link>
      <Typography component="span" variant="body2" color="text.primary" aria-current="page">
        {product.name}
      </Typography>
    </Breadcrumbs>
  );

  const header = (
    <Box component="header">
      <Typography variant="body2" color="text.secondary">
        <Link href={`/market/brands/${product.brand.slug}`} color="inherit">
          {product.brand.name}
        </Link>
        {' · '}
        <Link href={categoryHref(product.category)} color="inherit">
          {category}
        </Link>
      </Typography>
      <Typography
        variant="h1"
        sx={{ mt: 0.5, fontSize: { xs: 28, sm: 36 }, lineHeight: { xs: '32px', sm: '40px' } }}
      >
        {product.name}
      </Typography>
      {product.playerCount > 0 && (
        <Typography color="text.secondary" sx={{ mt: 0.5, fontVariantNumeric: 'tabular-nums' }}>
          {fill(t('market.product.playerCount'), {
            count: formatCount(product.playerCount, locale),
          })}
        </Typography>
      )}
      {user?.isAdmin === true && (
        <Button
          href={`/cabinet/catalog?edit=${product.id}`}
          startIcon={<Settings size={16} aria-hidden />}
          sx={{ mt: 2, minHeight: 44 }}
        >
          {t('market.product.edit')}
        </Button>
      )}
    </Box>
  );

  const attributes = hasAttributes && (
    <AsideCard title={t('market.product.attributes')}>
      <AttributeTable category={product.category} attrs={product.attrs} collapsed={!desktop} />
    </AsideCard>
  );
  const options = hasOptions(product.category, product.options) && (
    <AsideCard title={t('market.product.options')}>
      <ProductOptions category={product.category} options={product.options} />
    </AsideCard>
  );
  // Справочник в профилях (M1.2): «Кто играет» у оснований и накладок,
  // «Где стоит» у столов.
  const people =
    product.category === 'BLADE' || product.category === 'RUBBER' ? (
      <WhoPlays product={product} />
    ) : product.category === 'TABLE' ? (
      <WhereStands product={product} />
    ) : null;
  const description = product.description !== null && (
    <Box component="section" sx={{ mt: { xs: 4, md: 6 } }}>
      <Typography variant="h2" sx={{ mb: 2 }}>
        {t('market.product.description')}
      </Typography>
      <Typography sx={{ whiteSpace: 'pre-line', maxWidth: 680 }}>{product.description}</Typography>
    </Box>
  );

  if (desktop) {
    return (
      <>
        {crumbs}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 8fr) minmax(0, 4fr)', gap: 4 }}>
          <Box>
            <ProductGallery images={product.images} name={product.name} />
            {people}
            {description}
          </Box>
          <Box component="aside" sx={{ display: 'grid', gap: 2, alignContent: 'start' }}>
            {header}
            {attributes}
            {options}
            <AdSlot placement="product-aside" />
          </Box>
        </Box>
      </>
    );
  }

  // Телефон — своя раскладка (`docs/10` 5.5): лента фото, название,
  // характеристики свёрнуты до пяти главных, ниже варианты и описание.
  return (
    <>
      {crumbs}
      <ProductGallery images={product.images} name={product.name} strip />
      <Box sx={{ mt: product.images.length === 0 ? 0 : 3 }}>{header}</Box>
      <Box sx={{ mt: 3, display: 'grid', gap: 2 }}>
        {attributes}
        {options}
      </Box>
      {people}
      {description}
      <Box sx={{ mt: 4 }}>
        <AdSlot placement="product-aside" />
      </Box>
    </>
  );
}

function AsideCard({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <Paper variant="outlined" component="section" sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Typography variant="h3" component="h2" sx={{ mb: 1.5 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}
