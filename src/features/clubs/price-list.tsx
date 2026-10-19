import { PRICE_KINDS, type ClubPriceView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { formatMoney, useLocale, useT } from '@/common/i18n';

/**
 * Прайс клуба — ADR-055. Группами по виду, в порядке, заданном клубом
 * внутри группы. Цена — справа, цифрами в столбик; на телефоне строка
 * переносится, а не уезжает вбок.
 */
export default function PriceList({
  prices,
}: {
  readonly prices: readonly ClubPriceView[];
}): ReactNode {
  const t = useT();
  const locale = useLocale();

  const groups = PRICE_KINDS.map((kind) => ({
    kind,
    rows: prices.filter((price) => price.kind === kind),
  })).filter((group) => group.rows.length > 0);

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      {groups.map((group) => (
        <Box key={group.kind}>
          <Typography variant="h3" sx={{ mb: 1 }}>
            {t(`club.price.kind.${group.kind}`)}
          </Typography>
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
            {group.rows.map((price) => (
              <Box
                component="li"
                key={price.id}
                sx={{
                  py: 1.25,
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'baseline',
                  columnGap: 2,
                  borderTop: 1,
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 500 }}>{price.title}</Typography>
                  {price.note !== null && (
                    <Typography variant="body2" color="text.secondary">
                      {price.note}
                    </Typography>
                  )}
                </Box>
                <Typography
                  sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
                >
                  {formatMoney(price.priceKzt, locale)}
                  {price.unit !== 'NONE' && (
                    <Typography
                      component="span"
                      variant="body2"
                      color="text.secondary"
                      sx={{ ml: 0.75, fontWeight: 400 }}
                    >
                      {t(`club.price.unit.${price.unit}`)}
                    </Typography>
                  )}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
