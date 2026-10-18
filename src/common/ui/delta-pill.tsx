import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

import { formatDelta } from '@/common/i18n';

/**
 * Изменение рейтинга пилюлей: «+8.24» на зелёной подложке, «−5.10» — на
 * красной. Знак остаётся в тексте: цвет только помогает пробежать столбец
 * глазами и не единственный носитель смысла (запрет №6).
 */
export default function DeltaPill({ value }: { readonly value: string }): ReactNode {
  const negative = value.startsWith('-');
  const zero = /^0(\.0+)?$/.test(value);

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 24,
        px: 1,
        borderRadius: 1.5,
        fontWeight: 600,
        fontSize: 13,
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        ...(zero
          ? { bgcolor: 'var(--ink-100)', color: 'var(--ink-700)' }
          : negative
            ? { bgcolor: 'var(--red-50)', color: 'var(--red-700)' }
            : { bgcolor: 'var(--ok-50)', color: 'var(--ok-text)' }),
      }}
    >
      {formatDelta(value)}
    </Box>
  );
}
