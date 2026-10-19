import type { EquipmentLabel, PlayerListItemView } from '@kttf/shared/types';

import { productLabel } from '@/features/market/picked-product';

/**
 * Подпись товара из фильтра «Основание» или «Накладка» для чипа.
 *
 * В адресе лежит только идентификатор. Подпись берётся из выбора на этой
 * вкладке, а иначе — из найденных строк: при фильтре по основанию у всех
 * игроков оно одно, при фильтре по накладке — общая для всех строка справа
 * или слева.
 */
export function equipmentFilterLabel(
  id: string,
  kind: 'blade' | 'rubber',
  items: readonly PlayerListItemView[],
): string | undefined {
  const remembered = productLabel(id);
  if (remembered !== undefined) return remembered;

  const linked = (label: EquipmentLabel | null): string[] =>
    label?.slug == null ? [] : [label.label];

  if (kind === 'blade') return items.flatMap((item) => linked(item.blade))[0];

  let common: string[] | null = null;
  for (const item of items) {
    const labels = [...linked(item.rubberForehand), ...linked(item.rubberBackhand)];
    common = common === null ? labels : common.filter((label) => labels.includes(label));
  }

  return common?.[0];
}
