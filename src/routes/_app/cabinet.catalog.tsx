import { productCategorySchema } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useId, type ReactNode } from 'react';
import { z } from 'zod';

import { useT, type MessageKey } from '@/common/i18n';
import { searchPage, searchText } from '@/common/search';
import EmptyState from '@/common/ui/empty-state';
import { BackLink } from '@/common/ui/page-header';
import { useSessionStore } from '@/features/auth/session-store';
import BrandsAdmin from '@/features/market/admin/brands-admin';
import ImportPanel from '@/features/market/admin/import-panel';
import ProductsAdmin, { type ProductsAdminSearch } from '@/features/market/admin/products-admin';

const CATALOG_TABS = ['products', 'brands', 'import'] as const;
type CatalogTab = (typeof CATALOG_TABS)[number];

const TAB_LABELS: Readonly<Record<CatalogTab, MessageKey>> = {
  products: 'catalog.tab.products',
  brands: 'catalog.tab.brands',
  import: 'catalog.tab.import',
};

const searchSchema = z.object({
  tab: z.enum(CATALOG_TABS).optional().catch(undefined),
  q: searchText,
  category: productCategorySchema.optional().catch(undefined),
  page: searchPage,
  // Роутер пишет строку в адрес JSON-ом, а адрес товара бывает и числом.
  edit: z.coerce.string().trim().min(1).max(200).optional().catch(undefined),
});

export const Route = createFileRoute('/_app/cabinet/catalog')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: CatalogPage,
});

/**
 * Администрирование каталога маркета — `docs/10` 5.8, ADR-058.
 *
 * Товары, производители, импорт — вкладками в адресе. Страница проверяет
 * признак администратора сама, чтобы не показывать формы, которые сервер
 * всё равно отвергнет; права на запись проверяет сервер (ТС 8.3).
 */
function CatalogPage(): ReactNode {
  const t = useT();
  const user = useSessionStore((state) => state.user);

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <BackLink href="/cabinet" label={t('page.cabinet.title')} />
      <Typography variant="h1" sx={{ mt: 1 }}>
        {t('page.catalog.title')}
      </Typography>
      {user?.isAdmin === true ? (
        <>
          <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 680 }}>
            {t('catalog.lead')}
          </Typography>
          <Catalog />
        </>
      ) : (
        <Box sx={{ mt: 3 }}>
          <EmptyState
            title={t('catalog.forbidden.title')}
            text={t('places.forbidden.text')}
            action={<Button href="/cabinet">{t('page.cabinet.title')}</Button>}
          />
        </Box>
      )}
    </Container>
  );
}

function Catalog(): ReactNode {
  const t = useT();
  const id = useId();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const tab = search.tab ?? 'products';

  const onSearch = useCallback(
    (patch: ProductsAdminSearch, replace = false) => {
      void navigate({
        search: (previous) => ({ ...previous, ...patch }),
        replace,
        resetScroll: patch.edit !== undefined,
      });
    },
    [navigate],
  );

  return (
    <>
      <Tabs
        value={tab}
        onChange={(_, next: CatalogTab) => {
          void navigate({
            search: { tab: next === 'products' ? undefined : next },
            replace: true,
            resetScroll: false,
          });
        }}
        aria-label={t('page.catalog.title')}
        variant="scrollable"
        scrollButtons={false}
        sx={{ mt: 4 }}
      >
        {CATALOG_TABS.map((value) => (
          <Tab
            key={value}
            value={value}
            label={t(TAB_LABELS[value])}
            id={`${id}-tab-${value}`}
            aria-controls={`${id}-panel`}
          />
        ))}
      </Tabs>

      <Box
        key={tab}
        className="tab-panel-in"
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${tab}`}
      >
        {tab === 'products' && (
          <ProductsAdmin
            search={{
              q: search.q,
              category: search.category,
              page: search.page,
              edit: search.edit,
            }}
            onSearch={onSearch}
          />
        )}
        {tab === 'brands' && <BrandsAdmin />}
        {tab === 'import' && <ImportPanel />}
      </Box>
    </>
  );
}
