import type { PlayerProfileView, UpdatePlayerInput } from '@kttf/shared/types';

/** Место инвентаря: основание, накладка справа или слева. */
export type EquipmentSide = 'blade' | 'forehand' | 'backhand';

/**
 * «Играю» на странице товара — правка своей анкеты (ADR-058, `docs/10` 3.1).
 *
 * Отметить — поставить товар и стереть строку того же места: анкета не
 * говорит двумя голосами. Снять — убрать только товар: строки там уже нет.
 */
export function playPatch(side: EquipmentSide, productId: string, on: boolean): UpdatePlayerInput {
  const id = on ? productId : null;

  switch (side) {
    case 'blade':
      return on ? { bladeProductId: id, blade: null } : { bladeProductId: id };
    case 'forehand':
      return on
        ? { rubberForehandProductId: id, rubberForehand: null }
        : { rubberForehandProductId: id };
    case 'backhand':
      return on
        ? { rubberBackhandProductId: id, rubberBackhand: null }
        : { rubberBackhandProductId: id };
  }
}

/** Стоит ли этот товар на этом месте в анкете. */
export function playsWith(
  player: PlayerProfileView,
  side: EquipmentSide,
  productId: string,
): boolean {
  const product =
    side === 'blade'
      ? player.bladeProduct
      : side === 'forehand'
        ? player.rubberForehandProduct
        : player.rubberBackhandProduct;

  return product?.id === productId;
}
