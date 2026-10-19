import type { ProductListItemView } from '@kttf/shared/types';

/**
 * Выбранный товар — то, что нужно полю выбора: идентификатор, подпись и фото.
 *
 * Не весь товар каталога: в адресе списка игроков лежит только `bladeId`, и
 * поле должно показать выбор, даже когда известна одна подпись.
 */
export interface PickedProduct {
  readonly id: string;
  readonly label: string;
  readonly slug?: string;
  readonly brand?: string;
  readonly name?: string;
  readonly image: { readonly url: string } | null;
}

export function pickedOf(product: ProductListItemView): PickedProduct {
  return {
    id: product.id,
    slug: product.slug,
    label: `${product.brand.name} ${product.name}`,
    brand: product.brand.name,
    name: product.name,
    image: product.image === null ? null : { url: product.image.url },
  };
}

/**
 * Подписи выбранных за сессию товаров. Фильтр игроков по основанию
 * хранит в адресе идентификатор; подпись чипа берётся отсюда, если товар
 * выбрали или открыли на этой вкладке, а иначе — из строк списка.
 */
const labels = new Map<string, string>();

export function rememberProductLabel(id: string, label: string): void {
  labels.set(id, label);
}

export function productLabel(id: string): string | undefined {
  return labels.get(id);
}
