import type { CoachView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleCheck } from 'lucide-react';
import type { ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { fill, useT } from '@/common/i18n';
import { STALE_CABINET_DAYS, daysSince, freshnessWhen } from '@/features/clubs/club-time';

import { markCoachReviewed } from '../api';
import { coachKeys } from '../queries';

/**
 * Свежесть страницы тренера в кабинете — как у клуба (ADR-055): тренеру
 * видно то же, что игроку, но раньше. «Всё актуально» ставит отметку без
 * правок.
 */
export default function CoachFreshnessPanel({ coach }: { readonly coach: CoachView }): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const days = daysSince(coach.profileReviewedAt);
  const stale = days === null || days >= STALE_CABINET_DAYS;
  const reviewed = useMutation({
    mutationFn: () => markCoachReviewed(coach.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: coachKeys.all }),
  });

  return (
    <Paper
      variant="outlined"
      component="section"
      sx={{
        mt: 3,
        p: { xs: 2.5, sm: 3 },
        borderColor: stale ? 'var(--warn)' : undefined,
        bgcolor: stale ? 'var(--warn-50)' : undefined,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ minWidth: 0, maxWidth: 680 }}>
          <Typography variant="h3">
            {days === null
              ? t('manage.fresh.never')
              : fill(t('manage.fresh.updated'), { when: freshnessWhen(t, days) })}
          </Typography>
          <Typography
            variant="body2"
            sx={{ mt: 0.5, color: stale ? 'var(--warn-text)' : 'text.secondary' }}
          >
            {stale ? t('coach.fresh.cabinetStale') : t('manage.fresh.ok')}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<CircleCheck size={18} aria-hidden />}
          disabled={reviewed.isPending}
          onClick={() => {
            reviewed.mutate();
          }}
          sx={{ minHeight: 44 }}
        >
          {t('manage.fresh.confirm')}
        </Button>
      </Box>
      {reviewed.error !== null && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t(errorMessageKey(reviewed.error))}
        </Alert>
      )}
    </Paper>
  );
}
