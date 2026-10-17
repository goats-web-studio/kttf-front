import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { fill, formatCount, useLocale, useT } from '@/common/i18n';

/** Строка справочника: страна или город. Код есть только у страны. */
export interface PlaceRow {
  readonly id: string;
  readonly name: string;
  readonly nameKk: string | null;
  readonly sortOrder: number;
  readonly isActive: boolean;
  readonly code?: string;
}

interface PlaceTableProps<T extends PlaceRow> {
  readonly rows: readonly T[];
  /** Подпись таблицы для чтеца экрана. */
  readonly label: string;
  readonly withCode?: boolean;
  /** Строка, переключатель которой ждёт ответа сервера. */
  readonly pendingId?: string | undefined;
  readonly onEdit: (row: T) => void;
  readonly onToggle: (row: T, isActive: boolean) => void;
}

/** Колонки, которых на телефоне нет: они уходят подписью под название. */
const WIDE = { display: { xs: 'none', sm: 'table-cell' } } as const;

/** Числа — одной ширины цифр (docs/07-design-system.md, 6.1). */
const NUM = { fontVariantNumeric: 'tabular-nums' } as const;

/**
 * Таблица справочника — ADR-046.
 *
 * Как и рейтинг, на телефоне сжимается до трёх колонок: название, показ и
 * правка; код, казахское название и порядок уходят подписью под название,
 * горизонтальной прокрутки нет.
 *
 * Скрытая запись остаётся в таблице: удаления нет, и вернуть её в формы —
 * тем же переключателем.
 */
export default function PlaceTable<T extends PlaceRow>({
  rows,
  label,
  withCode = false,
  pendingId,
  onEdit,
  onToggle,
}: PlaceTableProps<T>): ReactNode {
  const t = useT();
  const locale = useLocale();

  return (
    <Table size="small" aria-label={label}>
      <TableHead>
        <TableRow>
          <TableCell>{t('places.field.name')}</TableCell>
          {withCode && <TableCell sx={WIDE}>{t('places.field.code')}</TableCell>}
          <TableCell sx={WIDE}>{t('places.field.nameKk')}</TableCell>
          <TableCell align="right" sx={WIDE}>
            {t('places.field.sortOrder')}
          </TableCell>
          <TableCell>{t('places.column.shown')}</TableCell>
          <TableCell />
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id} hover sx={{ height: { xs: 64, sm: 48 } }}>
            <TableCell>
              <Typography
                component="span"
                sx={{ fontWeight: 500, color: row.isActive ? 'text.primary' : 'text.secondary' }}
              >
                {row.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ display: { sm: 'none' } }}>
                {[row.code, row.nameKk, formatCount(row.sortOrder, locale)]
                  .filter((part) => part !== undefined && part !== null)
                  .join(' · ')}
              </Typography>
            </TableCell>
            {withCode && <TableCell sx={{ ...WIDE, ...NUM }}>{row.code}</TableCell>}
            <TableCell sx={{ ...WIDE, color: 'text.secondary' }}>{row.nameKk}</TableCell>
            <TableCell align="right" sx={{ ...WIDE, ...NUM, color: 'text.secondary' }}>
              {formatCount(row.sortOrder, locale)}
            </TableCell>
            <TableCell>
              {/* Подпись рядом с переключателем — состояние словом и зона
                  нажатия не меньше 44px (раздел 9). На телефоне слово
                  уходит: трём колонкам в 360px тесно. */}
              <FormControlLabel
                sx={{ m: 0, minHeight: 44 }}
                control={
                  <Switch
                    checked={row.isActive}
                    disabled={pendingId === row.id}
                    onChange={(event) => {
                      onToggle(row, event.target.checked);
                    }}
                    slotProps={{
                      input: { 'aria-label': fill(t('places.toggle'), { name: row.name }) },
                    }}
                  />
                }
                label={
                  <Box
                    component="span"
                    sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'inline' } }}
                  >
                    {t(row.isActive ? 'places.shown' : 'places.hidden')}
                  </Box>
                }
              />
            </TableCell>
            <TableCell align="right">
              <Button
                variant="text"
                aria-label={fill(t('places.editNamed'), { name: row.name })}
                onClick={() => {
                  onEdit(row);
                }}
                sx={{ minHeight: 44 }}
              >
                {t('places.edit')}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
