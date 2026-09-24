import type { TournamentView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { formatDateTime, formatMoney, useLocale, useT } from '@/common/i18n';

import { TOURNAMENT_LEVEL_KEYS } from './labels';
import StatusBadge from './status-badge';

interface TournamentSummaryProps {
  readonly tournament: TournamentView;
  /** `null` — справочник клубов ещё не пришёл либо клуб из него удалён. */
  readonly clubName: string | null;
}

/** Шапка страницы турнира: то, что человек ищет глазами первым (ТЗ 4.2). */
export default function TournamentSummary({
  tournament,
  clubName,
}: TournamentSummaryProps): ReactNode {
  const t = useT();
  const locale = useLocale();

  return (
    <header>
      <Typography variant="h1">{tournament.name}</Typography>

      <Box
        component="dl"
        sx={{
          mt: 2,
          mb: 0,
          display: 'grid',
          columnGap: 3,
          rowGap: 1,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        }}
      >
        <Field label={t('tournament.status')}>
          <StatusBadge status={tournament.status} />
        </Field>
        <Field label={t('tournament.startsAt')}>
          {formatDateTime(tournament.startsAt, locale)}
        </Field>
        <Field label={t('tournament.level')}>{t(TOURNAMENT_LEVEL_KEYS[tournament.level])}</Field>
        {clubName !== null && <Field label={t('tournament.club')}>{clubName}</Field>}
        <Field label={t('tournament.participants')}>
          <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {tournament.participantCount}
          </Box>
        </Field>
        <Field label={t('tournament.entryFee')}>
          <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {tournament.entryFee === 0
              ? t('tournament.entryFee.free')
              : formatMoney(tournament.entryFee, locale)}
          </Box>
        </Field>
      </Box>
    </header>
  );
}

function Field({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, typography: 'body2' }}>
      <Box component="dt" sx={{ color: 'text.secondary' }}>
        {label}
      </Box>
      <Box component="dd" sx={{ m: 0, color: 'text.primary' }}>
        {children}
      </Box>
    </Box>
  );
}
