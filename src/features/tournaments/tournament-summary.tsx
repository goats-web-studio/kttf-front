import type { TournamentView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { CalendarDays, Trophy, Users, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';

import { formatDateTime, formatMoney, useLocale, useT } from '@/common/i18n';
import { Count } from '@/common/ui/motion';
import StatTile from '@/common/ui/stat-tile';

import { TOURNAMENT_LEVEL_KEYS } from './labels';
import StatusBadge from './status-badge';

interface TournamentSummaryProps {
  readonly tournament: TournamentView;
  /** `null` — справочник клубов ещё не пришёл либо клуб из него удалён. */
  readonly clubName: string | null;
}

/**
 * Шапка страницы турнира: то, что человек ищет глазами первым (ТЗ 4.2).
 *
 * Карточка, а не строчки «Подпись — значение»: состояние пилюлей над
 * названием, а «когда, сколько, какой, почём» — плитками, которые читаются
 * с одного взгляда и на телефоне, и на экране зала.
 */
export default function TournamentSummary({
  tournament,
  clubName,
}: TournamentSummaryProps): ReactNode {
  const t = useT();
  const locale = useLocale();

  return (
    <Paper variant="outlined" component="header" sx={{ p: { xs: 2.5, sm: 4 } }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <StatusBadge status={tournament.status} />
        {clubName !== null && (
          <Link href={`/clubs/${tournament.clubId}`} variant="body2" sx={{ fontWeight: 500 }}>
            {clubName}
          </Link>
        )}
      </Stack>

      <Typography
        variant="h1"
        sx={{ mt: 1.5, fontSize: { xs: 30, sm: 40 }, lineHeight: { xs: '34px', sm: '44px' } }}
      >
        {tournament.name}
      </Typography>

      <Box
        sx={{
          mt: 3,
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
        }}
      >
        <StatTile
          icon={CalendarDays}
          label={t('tournament.startsAt')}
          value={formatDateTime(tournament.startsAt, locale)}
        />
        <StatTile
          icon={Users}
          label={t('tournament.participants')}
          value={<Count value={tournament.participantCount} />}
        />
        <StatTile
          icon={Trophy}
          label={t('tournament.level')}
          value={t(TOURNAMENT_LEVEL_KEYS[tournament.level])}
        />
        <StatTile
          icon={Wallet}
          label={t('tournament.entryFee')}
          value={
            tournament.entryFee === 0
              ? t('tournament.entryFee.free')
              : formatMoney(tournament.entryFee, locale)
          }
        />
      </Box>
    </Paper>
  );
}
