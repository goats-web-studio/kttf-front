import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import LevelBadge from '@/common/ui/level-badge';
import PlayerAvatar from '@/common/ui/player-avatar';
import RatingValue from '@/common/ui/rating-value';
import Surface from '@/common/ui/surface';
import { playersQuery } from '@/features/players/queries';

/** Лидеров в колонке: полный рейтинг — по ссылке. */
const TOP = 5;

/**
 * Лидеры рейтинга — коротко, в правой колонке главной (ADR-073). Таблица
 * с городами ушла в рейтинг: на главной из неё читали только первые строки.
 */
export default function RatingLeaders(): ReactNode {
  const t = useT();
  const top = useQuery(playersQuery({ page: 1, limit: TOP }));

  if ((top.data?.items.length ?? 0) === 0) return null;

  return (
    <Surface
      flush
      title={t('home.top.title')}
      action={
        <Link href="/players" variant="body2" underline="hover" sx={{ whiteSpace: 'nowrap' }}>
          {t('home.top.all')}
        </Link>
      }
    >
      <Box component="ol" sx={{ m: 0, p: 0 }} data-home-leaders>
        {top.data?.items.map((player, index) => (
          <Box
            component="li"
            key={player.id}
            sx={{
              listStyle: 'none',
              px: 2,
              py: 1,
              borderTop: '1px solid var(--line)',
              display: 'grid',
              gridTemplateColumns: '20px auto minmax(0, 1fr) auto',
              alignItems: 'center',
              gap: 1.25,
            }}
          >
            <Box
              sx={{
                fontWeight: 700,
                color: index === 0 ? 'var(--red-600)' : 'text.secondary',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {index + 1}
            </Box>
            <PlayerAvatar
              lastName={player.lastName}
              firstName={player.firstName}
              photoUrl={player.photoUrl}
              size="sm"
            />
            <Link
              href={`/players/${player.id}`}
              color="inherit"
              underline="hover"
              noWrap
              sx={{ typography: 'body2', fontWeight: 600 }}
            >
              {player.lastName} {player.firstName}
            </Link>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, typography: 'body2' }}>
              <RatingValue value={player.rating} animate={false} />
              <LevelBadge rating={player.rating} size={24} />
            </Box>
          </Box>
        ))}
      </Box>
    </Surface>
  );
}
