import type { ClubView } from '@kttf/shared/types';
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
import { useSessionStore } from '@/features/auth/session-store';

import { markClubReviewed, setClubHidden } from '../api';
import { STALE_CABINET_DAYS, daysSince, freshnessWhen } from '../club-time';
import { clubKeys } from '../queries';

/**
 * Свежесть страницы в кабинете — ADR-055. Клубу видно то же, что игроку,
 * но на месяц раньше: предупреждение с 60 дней, а игрок видит его с 90.
 * «Всё актуально» ставит отметку без правок. Администратору здесь же —
 * скрыть клуб из каталога.
 */
export default function FreshnessPanel({ club }: { readonly club: ClubView }): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const isAdmin = useSessionStore((state) => state.user?.isAdmin === true);
  const days = daysSince(club.profileReviewedAt);
  const stale = days === null || days >= STALE_CABINET_DAYS;

  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: clubKeys.all });
  };
  const reviewed = useMutation({ mutationFn: () => markClubReviewed(club.id), onSuccess: refresh });
  const hidden = useMutation({
    mutationFn: (hide: boolean) => setClubHidden(club.id, hide),
    onSuccess: refresh,
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
            {stale ? t('manage.fresh.stale') : t('manage.fresh.ok')}
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
      {isAdmin && (
        <Box
          sx={{
            mt: 2,
            pt: 2,
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 2,
          }}
        >
          {club.hidden && (
            <Typography variant="body2" color="text.secondary">
              {t('manage.hidden.state')}
            </Typography>
          )}
          <Button
            disabled={hidden.isPending}
            onClick={() => {
              hidden.mutate(!club.hidden);
            }}
            sx={{ minHeight: 44 }}
          >
            {t(club.hidden ? 'manage.hidden.show' : 'manage.hidden.hide')}
          </Button>
        </Box>
      )}
    </Paper>
  );
}
