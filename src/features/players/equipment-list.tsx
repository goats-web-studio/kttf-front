import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

import { useT, type MessageKey } from '@/common/i18n';

import { equipmentValue, type Equipment } from './equipment-value';

/**
 * «Чем играет» — основание и накладки списком: боковая колонка страницы
 * тренера (ADR-059) и карточка под шапкой профиля, там фото крупнее
 * (`thumb`). Незаполненное не показывается.
 */
export default function EquipmentList({
  player,
  thumb,
}: {
  readonly player: Equipment;
  readonly thumb?: number;
}): ReactNode {
  const t = useT();
  const rows: readonly (readonly [MessageKey, ReactNode])[] = [
    ['player.form.blade', equipmentValue(player.bladeProduct, player.blade, thumb)],
    [
      'player.form.rubberForehand',
      equipmentValue(player.rubberForehandProduct, player.rubberForehand, thumb),
    ],
    [
      'player.form.rubberBackhand',
      equipmentValue(player.rubberBackhandProduct, player.rubberBackhand, thumb),
    ],
  ];

  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        display: 'grid',
        gap: 1,
        typography: 'body2',
        '& dt': { color: 'text.secondary' },
        '& dd': { m: 0, overflowWrap: 'anywhere' },
      }}
    >
      {rows.map(([label, value]) =>
        value === null || value === '' ? null : (
          <Box key={label}>
            <dt>{t(label)}</dt>
            <dd>{value}</dd>
          </Box>
        ),
      )}
    </Box>
  );
}
