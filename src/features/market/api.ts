import type {
  BrandView,
  CreateBrandInput,
  CreateProductInput,
  ImportRowResult,
  Page,
  ProductImageView,
  ProductListItemView,
  ProductView,
  UpdateBrandInput,
  UpdateProductInput,
} from '@kttf/shared/types';

import { apiRequest } from '@/common/api';

/**
 * Каталог маркета — ADR-058, `docs/10` 3.1 (M1.1).
 *
 * Публичная часть открыта без входа, администрирование — только
 * администратору платформы: права проверяет сервер (ТС 8.3).
 */

/**
 * Параметры списка товаров строкой запроса — уже собранной
 * `catalogApiQuery`: фильтры по характеристикам зависят от категории, и
 * объектом с известными полями их не описать.
 */
export function listProducts(query: string): Promise<Page<ProductListItemView>> {
  return apiRequest<Page<ProductListItemView>>(`/catalog/products${query}`);
}

export function suggestProducts(query: string): Promise<readonly ProductListItemView[]> {
  return apiRequest<readonly ProductListItemView[]>(`/catalog/products/suggest${query}`);
}

export function fetchProduct(slug: string): Promise<ProductView> {
  return apiRequest<ProductView>(`/catalog/products/${encodeURIComponent(slug)}`);
}

export function listBrands(): Promise<readonly BrandView[]> {
  return apiRequest<readonly BrandView[]>('/catalog/brands');
}

export function fetchBrand(slug: string): Promise<BrandView> {
  return apiRequest<BrandView>(`/catalog/brands/${encodeURIComponent(slug)}`);
}

/**
 * Просмотр товара — без ожидания ответа, как у клуба.
 *
 * Ошибка учёта человеку не показывается: это число для популярности, а не
 * его действие.
 */
export function sendProductView(id: string): void {
  const url = `/api/v1/catalog/products/${id}/view`;

  if (typeof navigator.sendBeacon === 'function') {
    navigator.sendBeacon(url);

    return;
  }

  void fetch(url, { method: 'POST', keepalive: true }).catch(() => undefined);
}

// ---------- администрирование ----------

/**
 * Строка списка администратора. Сервер добавляет признаки скрытой и
 * предложенной карточки; читаются они осторожно — поле может и не прийти.
 */
export type AdminProductListItem = ProductListItemView & {
  readonly hidden?: boolean;
  readonly hiddenAt?: string | null;
  readonly status?: string;
};

/** Скрыт ли товар — по признаку, который сервер может и не прислать. */
export function hiddenOf(item: object): boolean | undefined {
  if ('hidden' in item && typeof item.hidden === 'boolean') return item.hidden;
  if ('hiddenAt' in item) return item.hiddenAt !== null && item.hiddenAt !== undefined;

  return undefined;
}

export function listAdminProducts(query: string): Promise<Page<AdminProductListItem>> {
  return apiRequest<Page<AdminProductListItem>>(`/admin/catalog/products${query}`);
}

export function createProduct(input: CreateProductInput): Promise<ProductView> {
  return apiRequest<ProductView>('/admin/catalog/products', { method: 'POST', body: input });
}

export function updateProduct(id: string, input: UpdateProductInput): Promise<ProductView> {
  return apiRequest<ProductView>(`/admin/catalog/products/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export async function setProductHidden(id: string, hidden: boolean): Promise<void> {
  await apiRequest<unknown>(`/admin/catalog/products/${id}/hidden`, {
    method: 'PATCH',
    body: { hidden },
  });
}

export function uploadProductImage(id: string, file: File): Promise<ProductImageView> {
  const form = new FormData();

  form.append('file', file);

  return apiRequest<ProductImageView>(`/admin/catalog/products/${id}/images`, {
    method: 'POST',
    body: form,
  });
}

export async function deleteProductImage(id: string, imageId: string): Promise<void> {
  await apiRequest<unknown>(`/admin/catalog/products/${id}/images/${imageId}`, {
    method: 'DELETE',
  });
}

export async function reorderProductImages(id: string, ids: readonly string[]): Promise<void> {
  await apiRequest<unknown>(`/admin/catalog/products/${id}/images/order`, {
    method: 'PUT',
    body: { ids },
  });
}

export function createBrand(input: CreateBrandInput): Promise<BrandView> {
  return apiRequest<BrandView>('/admin/catalog/brands', { method: 'POST', body: input });
}

export function updateBrand(id: string, input: UpdateBrandInput): Promise<BrandView> {
  return apiRequest<BrandView>(`/admin/catalog/brands/${id}`, { method: 'PATCH', body: input });
}

export async function uploadBrandLogo(id: string, file: File): Promise<void> {
  const form = new FormData();

  form.append('file', file);
  await apiRequest<unknown>(`/admin/catalog/brands/${id}/logo`, { method: 'POST', body: form });
}

/** Пачка импорта — не больше `IMPORT_BATCH_MAX` строк. */
export function importProducts(rows: readonly unknown[]): Promise<readonly ImportRowResult[]> {
  return apiRequest<readonly ImportRowResult[]>('/admin/catalog/import', {
    method: 'POST',
    body: { rows },
  });
}
