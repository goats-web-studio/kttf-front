import type { ReactNode } from 'react';

/**
 * Место под рекламу — ADR-055, решение 7, `docs/09` 5.5; маркет — ADR-058,
 * `docs/10` 5.9: `market-inline` карточкой в списке товаров после восьмой,
 * `product-aside` в правой колонке товара.
 *
 * Слоты заложены в макет с первого дня, чтобы появление рекламы не
 * переставляло страницы. Пока продаваемой рекламы нет, слот ничего не
 * выводит: пустой блок не показывается (ADR-042), а «здесь могла быть ваша
 * реклама» на сайте, который только набирает игроков, — шум.
 *
 * Когда реклама появится, слот получит заранее заданный размер (чтобы
 * вёрстка не прыгала при загрузке) и метку «Реклама» — `ad.label`.
 */
export type AdPlacement =
  'list-inline' | 'club-aside' | 'home-feed' | 'market-inline' | 'product-aside';

/** Реклама по местам. Пока пусто: продаваемой рекламы ещё нет. */
const ADS: Partial<Record<AdPlacement, ReactNode>> = {};

export default function AdSlot({ placement }: { readonly placement: AdPlacement }): ReactNode {
  return ADS[placement] ?? null;
}
