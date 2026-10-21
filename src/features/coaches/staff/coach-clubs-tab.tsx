import type { CoachView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';

import { requestClubCoach } from '../api';
import { ClubPicker } from '../editor/pickers';
import { coachKeys } from '../queries';
import StaffSection from './staff-section';

/**
 * «Клубы» в кабинете тренера — штаб глазами тренера (T2.1): попроситься
 * в клуб, ответить на приглашения, отозвать свои запросы, выйти из штаба.
 */
export default function CoachClubsTab({ coach }: { readonly coach: CoachView }): ReactNode {
  const t = useT();

  return (
    <>
      <StaffSection
        title={t('staff.coach.invites')}
        lead={t('staff.coach.invitesLead')}
        entries={coach.clubInvites}
        side="COACH"
      />
      <RequestForm coachId={coach.id} />
      <StaffSection title={t('staff.coach.requests')} entries={coach.clubRequests} side="COACH" />
      <StaffSection
        title={t('staff.coach.active')}
        entries={coach.clubs}
        side="COACH"
        empty={t('staff.coach.activeEmpty')}
      />
    </>
  );
}

/** «Попроситься в клуб»: клуб KTTF поиском и необязательная должность. */
function RequestForm({ coachId }: { readonly coachId: string }): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const [club, setClub] = useState<{ readonly id: string; readonly name: string } | null>(null);
  const [position, setPosition] = useState('');
  const [done, setDone] = useState(false);
  const request = useMutation({
    mutationFn: (clubId: string) =>
      requestClubCoach(coachId, {
        clubId,
        position: position.trim() === '' ? null : position.trim(),
      }),
    onSuccess: async () => {
      setClub(null);
      setPosition('');
      setDone(true);
      await queryClient.invalidateQueries({ queryKey: coachKeys.all });
    },
  });

  return (
    <Paper variant="outlined" component="section" sx={{ mt: 3, p: { xs: 2.5, sm: 4 } }}>
      <Typography variant="h2">{t('staff.coach.request')}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 680 }}>
        {t('staff.coach.requestLead')}
      </Typography>
      <Box
        sx={{
          mt: 2,
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 2fr) minmax(0, 1fr) auto' },
          alignItems: 'start',
        }}
      >
        <ClubPicker
          value={club?.id ?? null}
          name={club?.name ?? ''}
          error={false}
          onChange={(next) => {
            setClub(next);
            setDone(false);
          }}
        />
        <TextField
          size="small"
          label={t('staff.positionOptional')}
          placeholder={t('staff.positionHint')}
          value={position}
          onChange={(event) => {
            setPosition(event.target.value);
          }}
          slotProps={{ htmlInput: { maxLength: 60 } }}
        />
        <Button
          disabled={club === null || request.isPending}
          onClick={() => {
            if (club !== null) request.mutate(club.id);
          }}
          sx={{ minHeight: 40 }}
        >
          {t('staff.coach.requestAction')}
        </Button>
      </Box>
      {done && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {t('staff.coach.requested')}
        </Alert>
      )}
      {request.error !== null && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t(errorMessageKey(request.error))}
        </Alert>
      )}
    </Paper>
  );
}
