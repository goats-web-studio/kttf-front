import type { EquipmentTextKind, EquipmentTextView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { errorMessageKey, queryString } from '@/common/api';
import { fill, formatCount, useLocale, useT, type MessageKey } from '@/common/i18n';
import EmptyState from '@/common/ui/empty-state';
import Pagination from '@/common/ui/pagination';
import PillTabs from '@/common/ui/pill-tabs';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';

import { linkEquipmentText } from '../api';
import type { PickedProduct } from '../picked-product';
import ProductPicker from '../product-picker';
import { equipmentTextsQuery, marketKeys } from '../queries';

const PAGE_SIZE = 20;

const KINDS: readonly (readonly [EquipmentTextKind, MessageKey])[] = [
  ['BLADE', 'market.category.BLADE'],
  ['RUBBER', 'market.category.RUBBER'],
];

/**
 * Инвентарь игроков без товара — `docs/10` 4.2, 5.8.
 *
 * Строки анкет ADR-035, которые ещё не связаны с каталогом, — с числом
 * игроков: сверху самые частые. Связать строку — одно действие на всех,
 * кто её написал: «Тенерджи 05» у двадцати человек становится товаром у
 * двадцати. Поиск товара сразу заполнен самой строкой.
 */
export default function EquipmentTexts(): ReactNode {
  const t = useT();
  const [kind, setKind] = useState<EquipmentTextKind>('BLADE');
  const [page, setPage] = useState(1);
  const [done, setDone] = useState<number | null>(null);
  const texts = useQuery(equipmentTextsQuery(queryString({ kind, page, limit: PAGE_SIZE })));
  const pages = texts.data === undefined ? 1 : Math.max(1, Math.ceil(texts.data.total / PAGE_SIZE));

  return (
    <Box sx={{ mt: 3 }}>
      <Typography color="text.secondary" sx={{ maxWidth: 680 }}>
        {t('catalog.equipment.lead')}
      </Typography>
      <Box sx={{ mt: 2 }}>
        <PillTabs
          value={kind}
          options={KINDS}
          label={t('catalog.tab.equipment')}
          onChange={(next) => {
            setKind(next);
            setPage(1);
          }}
        />
      </Box>

      <Box sx={{ mt: 3 }}>
        <QueryState
          isPending={texts.isPending}
          error={texts.error}
          onRetry={() => void texts.refetch()}
          loading={<RowsSkeleton />}
        >
          {(texts.data?.items ?? []).length === 0 ? (
            <EmptyState title={t('catalog.equipment.empty')} />
          ) : (
            <Paper variant="outlined" component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
              {(texts.data?.items ?? []).map((item) => (
                <TextRow key={`${kind}-${item.text}`} kind={kind} item={item} onLinked={setDone} />
              ))}
            </Paper>
          )}
        </QueryState>
        <Pagination page={page} pages={pages} onPage={setPage} />
      </Box>

      <Snackbar
        open={done !== null}
        autoHideDuration={4000}
        onClose={() => {
          setDone(null);
        }}
        message={fill(t('catalog.equipment.linked'), { count: String(done ?? 0) })}
      />
    </Box>
  );
}

function TextRow({
  kind,
  item,
  onLinked,
}: {
  readonly kind: EquipmentTextKind;
  readonly item: EquipmentTextView;
  readonly onLinked: (count: number) => void;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [product, setProduct] = useState<PickedProduct | null>(null);

  const link = useMutation({
    mutationFn: (productId: string) => linkEquipmentText({ kind, text: item.text, productId }),
    onSuccess: async (result) => {
      onLinked(result.updated);
      // Строка ушла из списка, а у товара прибавились игроки.
      await queryClient.invalidateQueries({ queryKey: marketKeys.all });
    },
  });

  return (
    <Box
      component="li"
      sx={{
        display: 'grid',
        gap: 2,
        alignItems: 'center',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 2fr) minmax(0, 3fr) auto' },
        px: { xs: 2, sm: 3 },
        py: 2,
        borderTop: 1,
        borderColor: 'divider',
        '&:first-of-type': { borderTop: 0 },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{item.text}</Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {fill(t('catalog.equipment.players'), { count: formatCount(item.players, locale) })}
        </Typography>
      </Box>
      <ProductPicker
        category={kind}
        label={t('catalog.equipment.product')}
        value={product}
        onChange={setProduct}
        initialText={item.text}
        size="small"
      />
      <Button
        variant="outlined"
        disabled={product === null || link.isPending}
        onClick={() => {
          if (product !== null) link.mutate(product.id);
        }}
        sx={{ minHeight: 44 }}
      >
        {t('catalog.equipment.link')}
      </Button>
      {link.error !== null && (
        <Alert severity="error" sx={{ gridColumn: '1 / -1' }}>
          {t(errorMessageKey(link.error))}
        </Alert>
      )}
    </Box>
  );
}
