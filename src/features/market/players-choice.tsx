import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useT, type MessageKey } from '@/common/i18n';
import PillTabs from '@/common/ui/pill-tabs';
import QueryState from '@/common/ui/query-state';

import {
  CHOICE_BANDS,
  choiceQuery,
  type ChoiceBand,
  type ChoicePick,
} from './players-choice-query';
import ProductGrid, { ProductGridSkeleton } from './product-grid';
import { productsQuery } from './queries';

const BAND_LABELS: Readonly<Record<ChoiceBand, MessageKey>> = {
  all: 'market.choice.band.all',
  low: 'market.choice.band.low',
  mid: 'market.choice.band.mid',
  high: 'market.choice.band.high',
};

const PICK_LABELS: readonly (readonly [ChoicePick, MessageKey])[] = [
  ['BLADE', 'market.category.BLADE'],
  ['RUBBER', 'market.category.RUBBER'],
];

/**
 * «Выбор игроков Казахстана» — `docs/10` 3.1 (M1.2), 5.2.
 *
 * Товары по числу наших игроков, у которых они в инвентаре, с планкой
 * рейтинга: «чем играют 400+». Основания и накладки — отдельно: у них
 * разные игроки и разные числа. Товары без игроков сюда не попадают.
 */
export default function PlayersChoice({
  pick,
  band,
  onChange,
}: {
  readonly pick: ChoicePick;
  readonly band: ChoiceBand;
  readonly onChange: (next: { readonly pick: ChoicePick; readonly band: ChoiceBand }) => void;
}): ReactNode {
  const t = useT();
  const products = useQuery(productsQuery(choiceQuery(pick, band)));
  const items = (products.data?.items ?? []).filter((item) => item.playerCount > 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 2 }}>
        <PillTabs
          value={pick}
          options={PICK_LABELS}
          label={t('market.choice.title')}
          onChange={(next) => {
            onChange({ pick: next, band });
          }}
        />
        <Box
          role="group"
          aria-label={t('market.choice.band')}
          sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}
        >
          {CHOICE_BANDS.map((item) => (
            <Chip
              key={item}
              label={t(BAND_LABELS[item])}
              clickable
              variant={item === band ? 'filled' : 'outlined'}
              aria-pressed={item === band}
              onClick={() => {
                onChange({ pick, band: item });
              }}
              sx={{ height: 44 }}
            />
          ))}
        </Box>
      </Box>
      <QueryState
        isPending={products.isPending}
        error={products.error}
        onRetry={() => void products.refetch()}
        loading={<ProductGridSkeleton count={4} />}
      >
        {items.length === 0 ? (
          <Typography color="text.secondary">{t('market.choice.empty')}</Typography>
        ) : (
          <ProductGrid products={items} showPlayers />
        )}
      </QueryState>
    </Box>
  );
}
