import type { TrainingCoachRef } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';

import { inviteClubCoach } from '../api';
import { CoachPicker } from '../editor/pickers';
import { clubStaffManageQuery, coachKeys } from '../queries';
import StaffSection from './staff-section';

/**
 * «Тренеры» в кабинете клуба — тренерский штаб (T2.1, `docs/11` 3.2.1):
 * пригласить тренера, ответить на запросы, отозвать приглашение, править
 * должность и убрать из штаба. OWNER и ORGANIZER; права проверяет сервер.
 */
export default function ClubStaffPanel({ clubId }: { readonly clubId: string }): ReactNode {
  const t = useT();
  const staff = useQuery(clubStaffManageQuery(clubId));

  return (
    <QueryState
      isPending={staff.isPending}
      error={staff.error}
      onRetry={() => void staff.refetch()}
      loading={<RowsSkeleton rows={3} />}
    >
      {staff.data !== undefined && (
        <>
          <InviteForm clubId={clubId} />
          <StaffSection
            title={t('staff.club.requests')}
            lead={t('staff.club.requestsLead')}
            entries={staff.data.requests}
            side="CLUB"
          />
          <StaffSection title={t('staff.club.invited')} entries={staff.data.invited} side="CLUB" />
          <StaffSection
            title={t('staff.club.active')}
            entries={staff.data.active}
            side="CLUB"
            editablePosition
            empty={t('staff.club.activeEmpty')}
          />
        </>
      )}
    </QueryState>
  );
}

/** «Пригласить тренера»: тренер со страницей поиском и необязательная должность. */
function InviteForm({ clubId }: { readonly clubId: string }): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const [coach, setCoach] = useState<TrainingCoachRef | null>(null);
  const [position, setPosition] = useState('');
  const [done, setDone] = useState(false);
  const invite = useMutation({
    mutationFn: (coachId: string) =>
      inviteClubCoach(clubId, {
        coachId,
        position: position.trim() === '' ? null : position.trim(),
      }),
    onSuccess: async () => {
      setCoach(null);
      setPosition('');
      setDone(true);
      await queryClient.invalidateQueries({ queryKey: coachKeys.all });
    },
  });

  return (
    <Paper variant="outlined" component="section" sx={{ mt: 3, p: { xs: 2.5, sm: 4 } }}>
      <Typography variant="h2">{t('staff.club.invite')}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 680 }}>
        {t('staff.club.inviteLead')}
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
        <CoachPicker
          noneHint={false}
          value={coach}
          onChange={(next) => {
            setCoach(next);
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
          disabled={coach === null || invite.isPending}
          onClick={() => {
            if (coach !== null) invite.mutate(coach.id);
          }}
          sx={{ minHeight: 40 }}
        >
          {t('staff.club.inviteAction')}
        </Button>
      </Box>
      {done && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {t('staff.club.invited.done')}
        </Alert>
      )}
      {invite.error !== null && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t(errorMessageKey(invite.error))}
        </Alert>
      )}
    </Paper>
  );
}
