import type { ProductView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { fill, formatCount, useLocale, useT } from '@/common/i18n';
import ClubMark from '@/features/clubs/club-mark';
import { clubsQuery } from '@/features/clubs/queries';
import { usePlaceName } from '@/features/places/place-name';

/** Клубов на странице стола; их обычно немного, больше — редкость. */
const WHERE = 12;

/**
 * «Где стоит» — `docs/10` 3.1 (M1.2): клубы, где стоит этот стол. Число —
 * `clubCount` товара; клубов нет — блока нет (ADR-042).
 */
export default function WhereStands({ product }: { readonly product: ProductView }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const placeName = usePlaceName();
  const clubs = useQuery({
    ...clubsQuery({ page: 1, limit: WHERE, tableProductId: product.id }),
    enabled: product.clubCount > 0,
  });
  const items = clubs.data?.items ?? [];

  if (product.clubCount === 0 || items.length === 0) return null;

  return (
    <Box component="section" sx={{ mt: { xs: 4, md: 6 } }}>
      <Typography variant="h2" sx={{ mb: 2 }}>
        {fill(t('market.whereStands.title'), { count: formatCount(product.clubCount, locale) })}
      </Typography>
      <Paper variant="outlined" component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
        {items.map((club) => (
          <Box
            component="li"
            key={club.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 2,
              py: 1.5,
              borderTop: 1,
              borderColor: 'divider',
              '&:first-of-type': { borderTop: 0 },
            }}
          >
            <ClubMark club={club} size={40} />
            <Box sx={{ minWidth: 0 }}>
              <Link href={`/clubs/${club.id}`} color="text.primary" sx={{ fontWeight: 600 }}>
                {club.name}
              </Link>
              <Typography variant="body2" color="text.secondary">
                {placeName(club.city)}
              </Typography>
            </Box>
          </Box>
        ))}
      </Paper>
    </Box>
  );
}
