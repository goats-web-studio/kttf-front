import type { EquipmentLabel } from '@kttf/shared/types';
import Link from '@mui/material/Link';
import type { ReactNode } from 'react';

/** Ячейка инвентаря: товар каталога — ссылкой в маркет, строка анкеты — текстом. */
export function EquipmentText({ value }: { readonly value: EquipmentLabel | null }): ReactNode {
  if (value === null) return '—';
  if (value.slug === null) return value.label;

  return (
    <Link href={`/market/items/${value.slug}`} color="text.primary">
      {value.label}
    </Link>
  );
}
