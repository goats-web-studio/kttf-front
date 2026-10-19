import { queryOptions } from '@tanstack/react-query';

import {
  fetchAdminProduct,
  fetchBrand,
  fetchProduct,
  listEquipmentTexts,
  listAdminProducts,
  listBrands,
  listProducts,
  suggestProducts,
} from './api';

export const marketKeys = {
  all: ['market'] as const,
  products: (query: string) => ['market', 'products', query] as const,
  suggest: (query: string) => ['market', 'suggest', query] as const,
  product: (slug: string) => ['market', 'product', slug] as const,
  brands: ['market', 'brands'] as const,
  brand: (slug: string) => ['market', 'brand', slug] as const,
  admin: (query: string) => ['market', 'admin', query] as const,
  adminProduct: (id: string) => ['market', 'admin-product', id] as const,
  equipmentTexts: (query: string) => ['market', 'equipment-texts', query] as const,
};

/** Список товаров по готовой строке запроса — см. `catalogApiQuery`. */
export function productsQuery(query: string) {
  return queryOptions({
    queryKey: marketKeys.products(query),
    queryFn: () => listProducts(query),
    staleTime: 60_000,
  });
}

export function suggestQuery(query: string) {
  return queryOptions({
    queryKey: marketKeys.suggest(query),
    queryFn: () => suggestProducts(query),
    staleTime: 60_000,
  });
}

export function productQuery(slug: string) {
  return queryOptions({
    queryKey: marketKeys.product(slug),
    queryFn: () => fetchProduct(slug),
    staleTime: 5 * 60_000,
  });
}

/**
 * Производители одним списком: их сотни, а не тысячи, и они нужны сразу
 * нескольким местам — ленте на главной, фильтру и форме товара.
 */
export const brandsQuery = queryOptions({
  queryKey: marketKeys.brands,
  queryFn: listBrands,
  staleTime: 5 * 60_000,
});

export function brandQuery(slug: string) {
  return queryOptions({
    queryKey: marketKeys.brand(slug),
    queryFn: () => fetchBrand(slug),
    staleTime: 5 * 60_000,
  });
}

export function adminProductsQuery(query: string) {
  return queryOptions({
    queryKey: marketKeys.admin(query),
    queryFn: () => listAdminProducts(query),
  });
}

export function adminProductQuery(id: string) {
  return queryOptions({
    queryKey: marketKeys.adminProduct(id),
    queryFn: () => fetchAdminProduct(id),
  });
}

export function equipmentTextsQuery(query: string) {
  return queryOptions({
    queryKey: marketKeys.equipmentTexts(query),
    queryFn: () => listEquipmentTexts(query),
  });
}
