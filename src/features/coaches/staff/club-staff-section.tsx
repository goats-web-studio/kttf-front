import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import PlayerAvatar from '@/common/ui/player-avatar';
import RatingValue from '@/common/ui/rating-value';

import { coachPhoto, coachShortName } from '../labels';
import { clubStaffQuery } from '../queries';

/**
 * «Тренерский штаб» на странице клуба (T2.1, `docs/11` 3.2): тренеры со
 * страницей, которые здесь работают, — карточками со ссылкой. Пустой
 * штаб не выводится (ADR-042).
 */
export default function ClubStaffSection({ clubId }: { readonly clubId: string }): ReactNode {
  const t = useT();
  const staff = useQuery(clubStaffQuery(clubId));

  if (staff.data === undefined || staff.data.length === 0) return null;

  return (
    <Box component="section" data-club-staff sx={{ mt: 6 }}>
      <Typography variant="h2" sx={{ mb: 2 }}>
        {t('staff.public.title')}
      </Typography>
      <Box
        component="ul"
        sx={{
          m: 0,
          p: 0,
          listStyle: 'none',
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
        }}
      >
        {staff.data.map((entry) => (
          <Paper
            key={entry.coach.id}
            component="li"
            variant="outlined"
            sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}
          >
            <PlayerAvatar
              lastName={entry.coach.player.lastName}
              firstName={entry.coach.player.firstName}
              photoUrl={coachPhoto(entry.coach)}
              size="lg"
            />
            <Box sx={{ minWidth: 0 }}>
              <Link href={`/coaches/${entry.coach.slug}`} sx={{ fontWeight: 600 }}>
                {coachShortName(entry.coach.player)}
              </Link>
              <Typography variant="body2" color="text.secondary">
                <RatingValue value={entry.coach.player.rating} />
                {entry.position === null ? '' : ` · ${entry.position}`}
              </Typography>
            </Box>
          </Paper>
        ))}
      </Box>
    </Box>
  );
}
