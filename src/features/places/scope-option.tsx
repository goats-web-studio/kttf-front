import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

import { usePlaceName } from './place-name';
import type { ScopeOption } from './regions';

/**
 * Подпись пункта фильтра «Город» — ADR-096. Город — названием; область —
 * названием и тихой подсказкой, что выбираются все её города.
 */
export default function ScopeOptionLabel({ option }: { readonly option: ScopeOption }): ReactNode {
  const t = useT();
  const placeName = usePlaceName();

  if (option.kind === 'city') return placeName(option);

  return (
    <Box
      component="span"
      sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 1, minWidth: 0 }}
    >
      <Box component="span" sx={{ fontWeight: 500 }}>
        {placeName(option)}
      </Box>{' '}
      <Box component="span" sx={{ color: 'text.secondary', typography: 'body2' }}>
        {t('places.region.whole')}
      </Box>
    </Box>
  );
}
