import type { PlayerProfileView, ProductListItemView } from '@kttf/shared/types';
import Link from '@mui/material/Link';
import type { ReactNode } from 'react';

import { Thumb } from '@/features/market/product-picker';

/**
 * Инвентарь: товар каталога — ссылкой в маркет с маленьким фото, а чего в
 * каталоге нет — строкой анкеты (ADR-058).
 */
export function equipmentValue(
  product: ProductListItemView | null,
  text: string | null,
  thumb = 24,
): ReactNode {
  if (product === null) return text;

  return (
    <Link
      href={`/market/items/${product.slug}`}
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, verticalAlign: 'middle' }}
    >
      <Thumb image={product.image} size={thumb} />
      {`${product.brand.name} ${product.name}`}
    </Link>
  );
}

export type Equipment = Pick<
  PlayerProfileView,
  | 'blade'
  | 'bladeProduct'
  | 'rubberForehand'
  | 'rubberForehandProduct'
  | 'rubberBackhand'
  | 'rubberBackhandProduct'
>;

/** Есть ли что показать в «Чем играет». */
export function hasEquipment(player: Equipment): boolean {
  return [
    player.blade,
    player.bladeProduct,
    player.rubberForehand,
    player.rubberForehandProduct,
    player.rubberBackhand,
    player.rubberBackhandProduct,
  ].some((value) => value !== null && value !== '');
}
