import { setClubTablesSchema, type ClubView, type SetClubTablesInput } from '@kttf/shared/types';

import { pickedOf, type PickedProduct } from '@/features/market/picked-product';

/** Строка редактора: модель стола и число столов, как его набрали. */
export interface TableRow {
  readonly product: PickedProduct;
  readonly count: string;
}

export function tableRowsOf(club: ClubView): TableRow[] {
  return club.tables.map((table) => ({
    product: pickedOf(table.product),
    count: String(table.count),
  }));
}

/**
 * Строки — в `PUT /clubs/:id/tables`. Проверка — схемой общего кода, той же,
 * что на сервере: число столов целое от одного, модель не повторяется.
 * `null` — что-то не так, запрос не уходит.
 */
export function tablesPayload(rows: readonly TableRow[]): SetClubTablesInput | null {
  const input = {
    tables: rows.map((row) => ({
      productId: row.product.id,
      count: row.count.trim() === '' ? Number.NaN : Number(row.count.trim()),
    })),
  };
  const parsed = setClubTablesSchema.safeParse(input);

  return parsed.success ? parsed.data : null;
}
