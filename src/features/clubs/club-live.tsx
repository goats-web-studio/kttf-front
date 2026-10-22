import type { ClubPodium, ClubPodiumPlace } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { Swords, Trophy, Users } from 'lucide-react';
import type { ReactNode } from 'react';

import { fill, formatDate, useLocale, useT } from '@/common/i18n';
import { Count } from '@/common/ui/motion';
import StatTile from '@/common/ui/stat-tile';

import { clubSummaryQuery } from './queries';

/**
 * Живые данные клуба — ADR-055, решение 1: то, что у RTTF заполняется
 * руками, а у нас приходит из турниров. Пустой блок не показывается
 * (ADR-042): у нового клуба без турниров нет раздела с нулями.
 */
export function ClubNumbers({ clubId }: { readonly clubId: string }): ReactNode {
  const t = useT();
  const summary = useQuery(clubSummaryQuery(clubId));

  if (summary.data === undefined || summary.data.tournamentsHeld === 0) return null;

  const data = summary.data;

  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      <StatTile
        icon={Swords}
        label={t('club.live.matches')}
        value={<Count value={data.matchesRecent} />}
      />
      <StatTile
        icon={Users}
        label={t('club.live.players')}
        value={<Count value={data.activePlayersRecent} />}
      />
      <StatTile
        icon={Trophy}
        label={t('club.live.tournaments')}
        value={<Count value={data.tournamentsHeld} />}
      />
    </Box>
  );
}

const MEDAL: Readonly<Record<number, string>> = {
  1: 'var(--gold)',
  2: 'var(--silver)',
  3: 'var(--bronze)',
};

/** Итоги последних турниров с призёрами — как «Результаты» у RTTF, но сами. */
export function ClubResults({ clubId }: { readonly clubId: string }): ReactNode {
  const t = useT();
  const summary = useQuery(clubSummaryQuery(clubId));
  const podiums = summary.data?.podiums ?? [];

  if (podiums.length === 0) return null;

  return (
    <Box component="section" sx={{ mt: 6 }}>
      <Typography variant="h2" sx={{ mb: 2 }}>
        {t('club.results.title')}
      </Typography>
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        {podiums.map((podium) => (
          <Podium key={podium.tournamentId} podium={podium} />
        ))}
      </Box>
    </Box>
  );
}

function Podium({ podium }: { readonly podium: ClubPodium }): ReactNode {
  const t = useT();
  const locale = useLocale();

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Link href={`/tournaments/${podium.tournamentId}`} sx={{ fontWeight: 600 }}>
        {podium.name}
      </Link>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
        {formatDate(podium.startsAt, locale)} ·{' '}
        {fill(t('club.results.participants'), { count: String(podium.participants) })}
      </Typography>
      {podium.places.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          {t('club.results.noPlaces')}
        </Typography>
      ) : (
        <Box
          component="ol"
          sx={{ m: 0, mt: 1.5, p: 0, listStyle: 'none', display: 'grid', gap: 0.75 }}
        >
          {podium.places.map((place) => (
            <PlaceRow key={place.playerId} place={place} />
          ))}
        </Box>
      )}
    </Paper>
  );
}

function PlaceRow({ place }: { readonly place: ClubPodiumPlace }): ReactNode {
  const label =
    place.placeTo === null
      ? String(place.place)
      : `${String(place.place)}–${String(place.placeTo)}`;

  return (
    <Box component="li" sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <Box
        component="span"
        sx={{
          minWidth: 28,
          height: 22,
          px: 0.75,
          borderRadius: 999,
          display: 'inline-grid',
          placeItems: 'center',
          fontSize: 12,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          bgcolor: MEDAL[place.place] ?? 'var(--ink-100)',
          color: 'var(--ink-900)',
        }}
      >
        {label}
      </Box>
      <Link href={`/players/${place.playerId}`} variant="body2" sx={{ minWidth: 0 }}>
        {place.name}
      </Link>
    </Box>
  );
}
