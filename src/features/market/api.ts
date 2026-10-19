import type {
  AdminProductListItemView,
  AdminProductView,
  BrandView,
  CreateBrandInput,
  CreateProductInput,
  EquipmentTextView,
  ImportRowResult,
  LinkEquipmentTextInput,
  LinkEquipmentTextResult,
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

/** Список администратора — со скрытыми и предложенными магазинами. */
export function listAdminProducts(query: string): Promise<Page<AdminProductListItemView>> {
  return apiRequest<Page<AdminProductListItemView>>(`/admin/catalog/products${query}`);
}

/** Товар для правки — по идентификатору, в том числе скрытый. */
export function fetchAdminProduct(id: string): Promise<AdminProductView> {
  return apiRequest<AdminProductView>(`/admin/catalog/products/${id}`);
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

/** Логотип сохраняется сразу: в ответ — производитель с новым логотипом. */
export function uploadBrandLogo(id: string, file: File): Promise<BrandView> {
  const form = new FormData();

  form.append('file', file);

  return apiRequest<BrandView>(`/admin/catalog/brands/${id}/logo`, { method: 'POST', body: form });
}

/** Пачка импорта — не больше `IMPORT_BATCH_MAX` строк. */
export function importProducts(rows: readonly unknown[]): Promise<readonly ImportRowResult[]> {
  return apiRequest<readonly ImportRowResult[]>('/admin/catalog/import', {
    method: 'POST',
    body: { rows },
  });
}

/** Строки инвентаря анкет без товара — сопоставление (`docs/10` 4.2, 5.8). */
export function listEquipmentTexts(query: string): Promise<Page<EquipmentTextView>> {
  return apiRequest<Page<EquipmentTextView>>(`/admin/catalog/equipment-texts${query}`);
}

/** Связать строку с товаром разом у всех игроков, кто её написал. */
export function linkEquipmentText(input: LinkEquipmentTextInput): Promise<LinkEquipmentTextResult> {
  return apiRequest<LinkEquipmentTextResult>('/admin/catalog/equipment-texts/link', {
    method: 'POST',
    body: input,
  });
}
