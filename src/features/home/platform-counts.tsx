import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { formatCount, useLocale, useT, type MessageKey } from '@/common/i18n';
import { clubDirectoryQuery } from '@/features/clubs/queries';
import { coachesQuery } from '@/features/coaches/queries';
import { playersQuery } from '@/features/players/queries';
import { tournamentsQuery } from '@/features/tournaments/queries';

/**
 * Живые числа платформы под поиском первого экрана: игроки, клубы, турниры,
 * тренеры — каждое ссылкой в свой раздел.
 *
 * Отдельной ручки «статистика платформы» нет: число берётся из `total`
 * первой страницы в одну запись. Клубы — из справочника, который главная
 * всё равно грузит. Пока число не пришло или равно нулю, его нет вовсе:
 * «0 тренеров» на первом экране хуже пустого места.
 */
export default function PlatformCounts(): ReactNode {
  const t = useT();
  const locale = useLocale();
  const players = useQuery(playersQuery({ page: 1, limit: 1 }));
  const tournaments = useQuery(tournamentsQuery({ page: 1, limit: 1 }));
  const coaches = useQuery(coachesQuery({ page: 1, limit: 1 }));
  const clubs = useQuery(clubDirectoryQuery);

  const counts: readonly (readonly [MessageKey, number | undefined, string])[] = [
    ['home.counts.players', players.data?.total, '/players'],
    ['home.counts.clubs', clubs.data?.size, '/clubs'],
    ['home.counts.tournaments', tournaments.data?.total, '/tournaments'],
    ['home.counts.coaches', coaches.data?.total, '/trainings?view=coaches'],
  ];
  const shown = counts.filter(([, value]) => value !== undefined && value > 0);

  if (shown.length === 0) return null;

  return (
    <Box
      component="ul"
      sx={{
        listStyle: 'none',
        m: 0,
        mt: { xs: 4, md: 7 },
        p: 0,
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
        columnGap: { xs: 3, sm: 6 },
        rowGap: 2,
      }}
    >
      {shown.map(([label, value, href]) => (
        <Box component="li" key={label}>
          <Link
            href={href}
            underline="none"
            sx={{
              display: 'block',
              color: 'inherit',
              minWidth: 64,
              '&:hover .count-label': { color: 'var(--night-ink-900)' },
            }}
          >
            <Typography
              sx={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: { xs: 24, sm: 30 },
                lineHeight: 1.1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatCount(value ?? 0, locale)}
            </Typography>
            <Typography
              className="count-label"
              variant="body2"
              sx={{ mt: 0.5, color: 'var(--night-ink-700)', fontWeight: 500 }}
            >
              {t(label)}
            </Typography>
          </Link>
        </Box>
      ))}
    </Box>
  );
}
