import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

import type { TableState } from './queue';

interface TablePickerProps {
  readonly tables: readonly TableState[];
  readonly suggested: number | null;
  /** Стол, на котором встреча уже стоит: переносить на него же незачем. */
  readonly current?: number | null | undefined;
  readonly onPick: (tableNumber: number) => void;
}

/**
 * Столы зала кнопками — ТЗ 6.2.
 *
 * Все столы, а не только свободные: судья видит зал целиком и понимает, почему
 * его любимый третий стол сейчас недоступен. Занятый идущей встречей стол
 * погашен — поставить туда вторую пару значит устроить на нём давку.
 * Стол с закрытой встречей доступен: следующая пара садится туда, где только
 * что доиграли.
 *
 * Номера кнопками, а не выпадающим списком: в зале это одно касание пальцем,
 * а не прокрутка крошечного меню.
 */
export default function TablePicker({
  tables,
  suggested,
  current,
  onPick,
}: TablePickerProps): ReactNode {
  const t = useT();

  return (
    <Box
      role="group"
      aria-label={t('console.dialog.pickTable')}
      sx={{
        display: 'grid',
        gap: 1,
        gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
      }}
    >
      {tables.map((table) => {
        const here = table.number === current;
        const busy = table.status === 'PLAYING' && !here;
        const hint = here
          ? t('console.table.here')
          : busy
            ? t('console.table.busy')
            : table.number === suggested
              ? t('console.dialog.suggested')
              : null;

        return (
          <Button
            key={table.number}
            variant={table.number === suggested && !here ? 'contained' : 'outlined'}
            color={table.number === suggested && !here ? 'primary' : 'secondary'}
            disabled={busy || here}
            aria-label={`${t('console.table.number')} ${String(table.number)}`}
            onClick={() => {
              onPick(table.number);
            }}
            sx={{
              minHeight: 64,
              minWidth: 0,
              px: 0.5,
              flexDirection: 'column',
              gap: 0.25,
              textTransform: 'none',
            }}
          >
            <Box
              component="span"
              sx={{
                fontFamily: 'var(--font-mono)',
                fontSize: 22,
                lineHeight: '26px',
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {table.number}
            </Box>
            {hint !== null && (
              <Box component="span" sx={{ typography: 'caption' }}>
                {hint}
              </Box>
            )}
          </Button>
        );
      })}
    </Box>
  );
}
