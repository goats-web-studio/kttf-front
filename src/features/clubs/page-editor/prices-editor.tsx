import {
  CLUB_PRICES_MAX,
  CLUB_PRICE_KINDS,
  PRICE_UNITS,
  type ClubPriceInput,
  type ClubView,
  type ClubPriceKind,
  type PriceUnit,
} from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { useT, type MessageKey } from '@/common/i18n';

import { setClubPrices } from '../api';
import { clubKeys } from '../queries';
import EditorSection from './editor-section';
import { clubPriceKindOf, toPriceInputs, type PriceRow } from './price-rows';

const UNIT_LABELS: Readonly<Record<PriceUnit, MessageKey>> = {
  HOUR: 'club.price.unit.HOUR',
  VISIT: 'club.price.unit.VISIT',
  MONTH: 'club.price.unit.MONTH',
  COURSE: 'club.price.unit.COURSE',
  NONE: 'club.price.unit.NONE',
};

let nextKey = 0;
const newKey = (): string => {
  nextKey += 1;
  return `row-${String(nextKey)}`;
};

/**
 * Прайс клуба — ADR-055. Порядок строк задаёт клуб стрелками: в группе
 * вида на странице строки идут в этом порядке.
 */
export default function PricesEditor({ club }: { readonly club: ClubView }): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<readonly PriceRow[]>(() =>
    club.prices.map((price) => ({
      key: newKey(),
      kind: clubPriceKindOf(price.kind),
      title: price.title,
      price: String(price.priceKzt),
      unit: price.unit,
      note: price.note ?? '',
    })),
  );
  const [invalid, setInvalid] = useState<MessageKey | null>(null);
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: (prices: ClubPriceInput[]) => setClubPrices(club.id, { prices }),
    onSuccess: async () => {
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: clubKeys.all });
    },
  });

  const update = (next: readonly PriceRow[]): void => {
    setSaved(false);
    setRows(next);
  };
  const patch = (key: string, change: Partial<PriceRow>): void => {
    update(rows.map((row) => (row.key === key ? { ...row, ...change } : row)));
  };
  const move = (index: number, by: -1 | 1): void => {
    const next = [...rows];
    const [row] = next.splice(index, 1);

    if (row !== undefined) {
      next.splice(index + by, 0, row);
      update(next);
    }
  };

  return (
    <EditorSection
      title={t('manage.page.prices')}
      isPending={save.isPending}
      saved={saved}
      error={save.error}
      invalid={invalid}
      onSave={() => {
        const prices = toPriceInputs(rows);

        if (prices === null) {
          setInvalid('manage.prices.invalid');
          return;
        }

        setInvalid(null);
        save.mutate(prices);
      }}
    >
      {rows.length === 0 && (
        <Typography color="text.secondary">{t('manage.prices.empty')}</Typography>
      )}
      <Box sx={{ display: 'grid', gap: 2 }}>
        {rows.map((row, index) => (
          <Box
            key={row.key}
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr 1fr', md: '170px minmax(0, 1fr) 130px 150px auto' },
              alignItems: 'center',
              pb: 2,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <TextField
              select
              size="small"
              label={t('manage.prices.kind')}
              value={row.kind}
              onChange={(event) => {
                patch(row.key, { kind: event.target.value as ClubPriceKind });
              }}
            >
              {CLUB_PRICE_KINDS.map((kind) => (
                <MenuItem key={kind} value={kind}>
                  {t(`club.price.kind.${kind}`)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label={t('manage.prices.name')}
              value={row.title}
              onChange={(event) => {
                patch(row.key, { title: event.target.value });
              }}
              slotProps={{ htmlInput: { maxLength: 100 } }}
              sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}
            />
            <TextField
              size="small"
              label={t('manage.prices.price')}
              value={row.price}
              onChange={(event) => {
                patch(row.key, { price: event.target.value });
              }}
              slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 10 } }}
            />
            <TextField
              select
              size="small"
              label={t('manage.prices.unit')}
              value={row.unit}
              onChange={(event) => {
                patch(row.key, { unit: event.target.value as PriceUnit });
              }}
            >
              {PRICE_UNITS.map((unit) => (
                <MenuItem key={unit} value={unit}>
                  {t(UNIT_LABELS[unit])}
                </MenuItem>
              ))}
            </TextField>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <IconButton
                aria-label={t('manage.prices.up')}
                disabled={index === 0}
                onClick={() => {
                  move(index, -1);
                }}
                sx={{ width: 44, height: 44 }}
              >
                <ArrowUp size={18} aria-hidden />
              </IconButton>
              <IconButton
                aria-label={t('manage.prices.down')}
                disabled={index === rows.length - 1}
                onClick={() => {
                  move(index, 1);
                }}
                sx={{ width: 44, height: 44 }}
              >
                <ArrowDown size={18} aria-hidden />
              </IconButton>
              <IconButton
                aria-label={t('manage.prices.remove')}
                onClick={() => {
                  update(rows.filter((item) => item.key !== row.key));
                }}
                sx={{ width: 44, height: 44 }}
              >
                <X size={18} aria-hidden />
              </IconButton>
            </Box>
            <TextField
              size="small"
              label={t('manage.prices.note')}
              value={row.note}
              onChange={(event) => {
                patch(row.key, { note: event.target.value });
              }}
              slotProps={{ htmlInput: { maxLength: 200 } }}
              sx={{ gridColumn: '1 / -1' }}
            />
          </Box>
        ))}
      </Box>
      {rows.length < CLUB_PRICES_MAX && (
        <Button
          startIcon={<Plus size={16} aria-hidden />}
          onClick={() => {
            update([
              ...rows,
              { key: newKey(), kind: 'TABLE_RENT', title: '', price: '', unit: 'HOUR', note: '' },
            ]);
          }}
          sx={{ mt: 2, minHeight: 44 }}
        >
          {t('manage.prices.add')}
        </Button>
      )}
    </EditorSection>
  );
}
