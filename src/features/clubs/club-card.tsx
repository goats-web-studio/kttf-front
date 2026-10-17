import type { ClubView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import CardActionArea from '@mui/material/CardActionArea';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';
import { usePlaceName } from '@/features/places/place-name';

import ClubMark from './club-mark';

/**
 * Клуб в списке — docs/07-design-system.md, 5.2, `ClubCard`.
 *
 * Слева знак клуба, справа то, по чему выбирают зал: название, город с
 * адресом и сколько в нём столов. Вся карточка — одна ссылка, как и у
 * турнира: на телефоне попадать пальцем в название не нужно.
 */
export default function ClubCard({ club }: { readonly club: ClubView }): ReactNode {
  const t = useT();
  const placeName = usePlaceName();
  const titleId = `club-${club.id}`;

  return (
    <CardActionArea
      href={`/clubs/${club.id}`}
      aria-labelledby={titleId}
      sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2, px: { sm: 1.5 } }}
    >
      <ClubMark club={club} size={48} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography id={titleId} variant="h3" component="h2">
          {club.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          {club.address === null
            ? placeName(club.city)
            : `${placeName(club.city)} · ${club.address}`}
        </Typography>
      </Box>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}
      >
        {fill(t('club.tables'), { count: String(club.tableCount) })}
      </Typography>
    </CardActionArea>
  );
}
