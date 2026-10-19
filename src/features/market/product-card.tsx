import { catalogImageVariant, type ProductListItemView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { fill, formatCount, useLocale, useT } from '@/common/i18n';

import { CATEGORY_ICONS, productHref } from './labels';

/**
 * Карточка товара в плитке — `docs/10` 5.3.
 *
 * Фото 1:1 узким вариантом: 240 точек на телефон в две колонки, 640 — на
 * плотный экран. Ширина и высота у картинки заданы, поэтому плитка не
 * прыгает, пока фото грузится. Первый экран грузится сразу, остальное —
 * лениво. Цены и магазинов здесь пока нет — они придут с предложениями
 * магазинов (M1.3), и пустого места под них не оставлено.
 */
export default function ProductCard({
  product,
  eager = false,
  showPlayers = false,
}: {
  readonly product: ProductListItemView;
  readonly eager?: boolean;
  /** «Игроков: 12» — в «Выборе игроков» и при таком порядке списка. */
  readonly showPlayers?: boolean;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const Icon = CATEGORY_ICONS[product.category];
  const image = product.image;

  return (
    <ButtonBase
      href={productHref(product.slug)}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        height: '100%',
        textAlign: 'left',
        borderRadius: 4,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        boxShadow: 'var(--shadow-card)',
        transition: 'box-shadow var(--dur-fast) var(--ease)',
        '@media (hover: hover)': { '&:hover': { boxShadow: 'var(--shadow-card-hover)' } },
        '&.Mui-focusVisible': { outline: '2px solid var(--red-600)', outlineOffset: '2px' },
      }}
    >
      <Box
        sx={{
          aspectRatio: '1 / 1',
          bgcolor: 'var(--paper)',
          borderBottom: 1,
          borderColor: 'divider',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--ink-400)',
        }}
      >
        {image === null ? (
          <Icon size={40} aria-label={t('market.card.noPhoto')} />
        ) : (
          <Box
            component="img"
            src={catalogImageVariant(image.url, 240)}
            srcSet={`${catalogImageVariant(image.url, 240)} 240w, ${catalogImageVariant(image.url, 640)} 640w`}
            sizes="(min-width: 900px) 280px, (min-width: 640px) 33vw, 50vw"
            width={image.width}
            height={image.height}
            alt=""
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain', p: 1 }}
          />
        )}
      </Box>
      <Box sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {product.brand.name}
        </Typography>
        <Typography
          sx={{
            fontWeight: 600,
            mt: 0.25,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            overflowWrap: 'anywhere',
          }}
        >
          {product.name}
        </Typography>
        {showPlayers && product.playerCount > 0 && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 0.5, fontVariantNumeric: 'tabular-nums' }}
          >
            {fill(t('market.card.players'), { count: formatCount(product.playerCount, locale) })}
          </Typography>
        )}
      </Box>
    </ButtonBase>
  );
}

/** Заготовка карточки на время загрузки — той же формы. */
export function ProductCardSkeleton(): ReactNode {
  return (
    <Box>
      <Skeleton variant="rounded" sx={{ width: '100%', height: 'auto', aspectRatio: '1 / 1' }} />
      <Skeleton width="40%" sx={{ mt: 1 }} />
      <Skeleton width="80%" />
    </Box>
  );
}
