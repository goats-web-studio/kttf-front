import { CLUB_TABLE_MODELS_MAX, type ClubView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { fill, useT, type MessageKey } from '@/common/i18n';
import ProductPicker, { Thumb } from '@/features/market/product-picker';

import { setClubTables } from '../api';
import { clubKeys } from '../queries';
import EditorSection from './editor-section';
import { tablesPayload, tableRowsOf, type TableRow } from './tables-model';

/**
 * Модели столов — из каталога маркета (ADR-058, `docs/10` 3.1, M1.2). На
 * странице клуба модели — ссылками на товар, а на странице стола — «Где
 * стоит». Список уходит целиком, как часы и цены.
 */
export default function TablesEditor({ club }: { readonly club: ClubView }): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<TableRow[]>(() => tableRowsOf(club));
  const [invalid, setInvalid] = useState<MessageKey | null>(null);
  const [saved, setSaved] = useState(false);
  const [picker, setPicker] = useState(0);

  const save = useMutation({
    mutationFn: (input: NonNullable<ReturnType<typeof tablesPayload>>) =>
      setClubTables(club.id, input),
    onSuccess: async () => {
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: clubKeys.all });
    },
  });

  const change = (next: TableRow[]): void => {
    setSaved(false);
    setInvalid(null);
    setRows(next);
  };

  return (
    <EditorSection
      title={t('manage.tables.title')}
      lead={fill(t('manage.tables.lead'), { max: String(CLUB_TABLE_MODELS_MAX) })}
      isPending={save.isPending}
      saved={saved}
      error={save.error}
      invalid={invalid}
      onSave={() => {
        const payload = tablesPayload(rows);

        if (payload === null) {
          setInvalid('manage.tables.invalid');
          return;
        }
        save.mutate(payload);
      }}
    >
      {rows.length > 0 && (
        <Box
          component="ul"
          sx={{ m: 0, p: 0, mb: 2, listStyle: 'none', display: 'grid', gap: 1.5 }}
        >
          {rows.map((row, index) => (
            <Box
              component="li"
              key={row.product.id}
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}
            >
              <Thumb image={row.product.image} size={40} />
              <Typography sx={{ fontWeight: 600, flex: '1 1 200px', minWidth: 0 }}>
                {row.product.label}
              </Typography>
              <TextField
                size="small"
                label={t('manage.tables.count')}
                value={row.count}
                onChange={(event) => {
                  change(
                    rows.map((item, at) =>
                      at === index
                        ? { ...item, count: event.target.value.replace(/\D/g, '') }
                        : item,
                    ),
                  );
                }}
                slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 3 } }}
                sx={{ width: 120 }}
              />
              <IconButton
                aria-label={fill(t('manage.tables.remove'), { name: row.product.label })}
                onClick={() => {
                  change(rows.filter((_, at) => at !== index));
                }}
                sx={{ width: 44, height: 44 }}
              >
                <Trash2 size={18} aria-hidden />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
      {rows.length < CLUB_TABLE_MODELS_MAX && (
        <ProductPicker
          // Ключ сбрасывает поле после выбора: следующая модель ищется с чистого листа.
          key={picker}
          category="TABLE"
          label={t('manage.tables.add')}
          value={null}
          onChange={(product) => {
            if (product === null) return;
            setPicker((value) => value + 1);
            if (rows.some((row) => row.product.id === product.id)) return;
            change([...rows, { product, count: '1' }]);
          }}
        />
      )}
    </EditorSection>
  );
}
