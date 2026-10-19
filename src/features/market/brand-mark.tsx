import { catalogImageVariant, type BrandView } from '@kttf/shared/types';
import Avatar from '@mui/material/Avatar';
import type { ReactNode } from 'react';

/**
 * Знак производителя: логотип, а без него — первая буква, как у клуба.
 * Логотип — узким вариантом: знак не шире 96 точек.
 */
export default function BrandMark({
  brand,
  size,
}: {
  readonly brand: Pick<BrandView, 'name' | 'logoUrl'>;
  readonly size: number;
}): ReactNode {
  return (
    <Avatar
      variant="rounded"
      src={brand.logoUrl === null ? undefined : catalogImageVariant(brand.logoUrl, 240)}
      alt=""
      slotProps={{
        img: { width: size, height: size, loading: 'lazy', style: { objectFit: 'contain' } },
      }}
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '28%',
        bgcolor: brand.logoUrl === null ? 'var(--ink-100)' : 'var(--paper)',
        border: 1,
        borderColor: 'divider',
        color: 'var(--ink-700)',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: Math.round(size * 0.42),
      }}
    >
      {brand.name.trim().charAt(0).toUpperCase()}
    </Avatar>
  );
}
