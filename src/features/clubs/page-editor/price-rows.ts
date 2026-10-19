import {
  setClubPricesSchema,
  type ClubPriceInput,
  type PriceKind,
  type PriceUnit,
} from '@kttf/shared/types';

export /** Строка в форме: цена строкой, как её вписали; ключ — для перестановки. */
interface PriceRow {
  readonly key: string;
  readonly kind: PriceKind;
  readonly title: string;
  readonly price: string;
  readonly unit: PriceUnit;
  readonly note: string;
}

/** Строки формы — в тело запроса. `null` — в форме ошибка. */
export function toPriceInputs(rows: readonly PriceRow[]): ClubPriceInput[] | null {
  const prices = rows.map((row) => ({
    kind: row.kind,
    title: row.title.trim(),
    priceKzt: /^\d+$/.test(row.price.replace(/\s/g, ''))
      ? Number(row.price.replace(/\s/g, ''))
      : NaN,
    unit: row.unit,
    note: row.note.trim() === '' ? null : row.note.trim(),
  }));

  return setClubPricesSchema.safeParse({ prices }).success ? prices : null;
}
