import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import type { ReactNode } from 'react';

import { useT, type MessageKey } from '@/common/i18n';

/**
 * До скольких побед идёт встреча — ТЗ 5.2: bo3, bo5, bo7.
 *
 * Своим файлом: им пользуется и редактор схемы, и окно «Столы и длины» в
 * консоли. Из редактора консоль тянула бы его целиком и выходила за бюджет
 * precache (ADR-032).
 */
export default function SetsField({
  label,
  value,
  onChange,
}: {
  readonly label: MessageKey;
  readonly value: 2 | 3 | 4;
  readonly onChange: (value: 2 | 3 | 4) => void;
}): ReactNode {
  const t = useT();

  return (
    <TextField
      select
      label={t(label)}
      value={String(value)}
      onChange={(event) => {
        onChange(event.target.value === '2' ? 2 : event.target.value === '4' ? 4 : 3);
      }}
    >
      <MenuItem value="2">{t('tournament.form.bo3')}</MenuItem>
      <MenuItem value="3">{t('tournament.form.bo5')}</MenuItem>
      <MenuItem value="4">{t('tournament.form.bo7')}</MenuItem>
    </TextField>
  );
}
