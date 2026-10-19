import type { ClubAmenity } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import { VISUALLY_HIDDEN } from '@/common/ui/visually-hidden';

import { AMENITY_ICONS, amenityLabel } from './amenity-meta';

/**
 * Удобства клуба — ADR-055.
 *
 * На странице — иконка и подпись. В карточке списка — только иконки:
 * подпись остаётся чтецу экрана и всплывает под курсором, а ряд из пяти
 * слов не влезает в карточку на телефоне.
 */
export default function Amenities({
  amenities,
  compact = false,
}: {
  readonly amenities: readonly ClubAmenity[];
  readonly compact?: boolean;
}): ReactNode {
  const t = useT();

  if (amenities.length === 0) return null;

  return (
    <Box
      component="ul"
      sx={{
        m: 0,
        p: 0,
        listStyle: 'none',
        display: 'flex',
        flexWrap: 'wrap',
        gap: compact ? 1 : 1.5,
      }}
    >
      {amenities.map((amenity) => {
        const Icon = AMENITY_ICONS[amenity];
        const label = t(amenityLabel(amenity));

        return (
          <Box
            component="li"
            key={amenity}
            title={compact ? label : undefined}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              color: 'var(--ink-700)',
              ...(compact
                ? {}
                : { px: 1.25, py: 0.5, borderRadius: 999, bgcolor: 'var(--paper-sunken)' }),
            }}
          >
            <Icon size={compact ? 16 : 18} aria-hidden />
            {compact ? (
              <Box component="span" sx={VISUALLY_HIDDEN}>
                {label}
              </Box>
            ) : (
              <Typography component="span" variant="body2">
                {label}
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
