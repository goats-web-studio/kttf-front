import {
  CLUB_PRICE_KINDS,
  setClubPricesSchema,
  type ClubPriceInput,
  type ClubPriceKind,
  type PriceKind,
  type PriceUnit,
} from '@kttf/shared/types';

export /** Строка в форме: цена строкой, как её вписали; ключ — для перестановки. */
interface PriceRow {
  readonly key: string;
  readonly kind: ClubPriceKind;
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

/**
 * Вид строки прайса для формы. Тренировки и детские группы из прайса ушли
 * (ADR-059): сервер их больше не отдаёт, но если старая строка всё же
 * придёт, форма не падает, а показывает её как «Прочее».
 */
export function clubPriceKindOf(kind: PriceKind): ClubPriceKind {
  return (CLUB_PRICE_KINDS as readonly PriceKind[]).includes(kind)
    ? (kind as ClubPriceKind)
    : 'OTHER';
}
