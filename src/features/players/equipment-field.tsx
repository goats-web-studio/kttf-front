import type { ProductCategory } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { useState, type ReactNode } from 'react';

import { useT } from '@/common/i18n';
import type { PickedProduct } from '@/features/market/picked-product';
import ProductPicker from '@/features/market/product-picker';

export interface EquipmentValue {
  /** Товар каталога; `null` — не выбран. */
  readonly product: PickedProduct | null;
  /** Строка анкеты ADR-035 — для того, чего в каталоге нет. */
  readonly text: string | undefined;
}

interface EquipmentFieldProps {
  readonly category: Extract<ProductCategory, 'BLADE' | 'RUBBER'>;
  readonly label: string;
  readonly value: EquipmentValue;
  readonly onChange: (value: EquipmentValue) => void;
}

/**
 * Основание или накладка — товар каталога, а если его нет, строка вручную
 * (ADR-058, `docs/10` 4.2).
 *
 * Одно из двух, а не оба: выбранный товар стирает строку, вписанная строка —
 * товар. Иначе профиль говорил бы двумя голосами, и «Кто играет» считал бы
 * человека по товару, а люди читали бы строку.
 */
export default function EquipmentField({
  category,
  label,
  value,
  onChange,
}: EquipmentFieldProps): ReactNode {
  const t = useT();
  const [manual, setManual] = useState(value.product === null && value.text !== undefined);

  if (manual) {
    return (
      <Box>
        <TextField
          fullWidth
          label={label}
          helperText={t('player.form.equipmentManualHint')}
          value={value.text ?? ''}
          onChange={(event) => {
            const text = event.target.value;
            onChange({ product: null, text: text.trim() === '' ? undefined : text });
          }}
          slotProps={{ htmlInput: { maxLength: 120 } }}
        />
        <Button
          size="small"
          onClick={() => {
            setManual(false);
          }}
          sx={{ mt: 0.5, minHeight: 44 }}
        >
          {t('player.form.equipmentFromCatalog')}
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <ProductPicker
        category={category}
        label={label}
        value={value.product}
        onChange={(product) => {
          onChange({ product, text: undefined });
        }}
      />
      <Button
        size="small"
        onClick={() => {
          setManual(true);
          onChange({ product: null, text: value.text });
        }}
        sx={{ mt: 0.5, minHeight: 44 }}
      >
        {t('player.form.equipmentManual')}
      </Button>
    </Box>
  );
}
