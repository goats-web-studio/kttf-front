import type { CoachStudentRow, CoachView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { fill, formatDate, useLocale, useT } from '@/common/i18n';
import Pagination from '@/common/ui/pagination';
import PlayerAvatar from '@/common/ui/player-avatar';
import QueryState from '@/common/ui/query-state';
import RatingValue from '@/common/ui/rating-value';
import { RowsSkeleton } from '@/common/ui/skeleton';
import { playerKeys } from '@/features/players/queries';

import { removeCoachStudent } from '../api';
import { coachKeys, coachStudentsManageQuery } from '../queries';

/**
 * «Ученики» в кабинете тренера (T2.1): все текущие — у кого он выбран в
 * анкете, с годом рождения и датой начала. Чужую ссылку на себя тренер
 * убирает сам — это меняет анкету игрока, поэтому с подтверждением.
 */
export default function CoachStudentsTab({ coach }: { readonly coach: CoachView }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [removing, setRemoving] = useState<CoachStudentRow | null>(null);
  const students = useQuery(coachStudentsManageQuery(coach.id, page));
  const remove = useMutation({
    mutationFn: (playerId: string) => removeCoachStudent(coach.id, playerId),
    onSuccess: async () => {
      setRemoving(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: coachKeys.all }),
        queryClient.invalidateQueries({ queryKey: playerKeys.all }),
      ]);
    },
  });
  const pages =
    students.data === undefined
      ? 1
      : Math.max(1, Math.ceil(students.data.total / students.data.limit));

  return (
    <Paper variant="outlined" component="section" sx={{ mt: 3, p: { xs: 2.5, sm: 4 } }}>
      <Typography variant="h2">{t('students.manage.title')}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 680 }}>
        {t('students.manage.lead')}
      </Typography>
      <Box sx={{ mt: 2 }}>
        <QueryState
          isPending={students.isPending}
          error={students.error}
          onRetry={() => void students.refetch()}
          loading={<RowsSkeleton rows={3} />}
        >
          {students.data?.items.length === 0 ? (
            <Typography color="text.secondary">{t('students.manage.empty')}</Typography>
          ) : (
            <Box component="ul" data-students-manage sx={{ m: 0, p: 0, listStyle: 'none' }}>
              {students.data?.items.map((row) => (
                <Box
                  component="li"
                  key={row.player.id}
                  data-student={row.player.id}
                  sx={{
                    py: 1.5,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.5,
                    borderTop: 1,
                    borderColor: 'divider',
                    '&:first-of-type': { borderTop: 0 },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                    <PlayerAvatar
                      lastName={row.player.lastName}
                      firstName={row.player.firstName}
                      photoUrl={row.player.photoUrl}
                      size="md"
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Link href={`/players/${row.player.id}`} sx={{ fontWeight: 600 }}>
                        {`${row.player.lastName} ${row.player.firstName}`}
                      </Link>{' '}
                      <RatingValue
                        value={row.player.rating}
                        sx={{ typography: 'body2', color: 'text.secondary' }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {fill(t('students.manage.row'), {
                          year: String(row.birthYear),
                          since: formatDate(row.since, locale),
                        })}
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    variant="text"
                    color="error"
                    onClick={() => {
                      setRemoving(row);
                    }}
                    sx={{ minHeight: 44 }}
                  >
                    {t('students.manage.remove')}
                  </Button>
                </Box>
              ))}
            </Box>
          )}
        </QueryState>
      </Box>
      {pages > 1 && (
        <Box sx={{ mt: 2 }}>
          <Pagination page={page} pages={pages} onPage={setPage} />
        </Box>
      )}
      <RemoveDialog
        row={removing}
        pending={remove.isPending}
        error={remove.error}
        onClose={() => {
          setRemoving(null);
        }}
        onConfirm={(playerId) => {
          remove.mutate(playerId);
        }}
      />
    </Paper>
  );
}

/** Подтверждение: убирается ссылка на тренера из анкеты игрока. */
function RemoveDialog({
  row,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  readonly row: CoachStudentRow | null;
  readonly pending: boolean;
  readonly error: unknown;
  readonly onClose: () => void;
  readonly onConfirm: (playerId: string) => void;
}): ReactNode {
  const t = useT();
  const id = useId();
  const name = row === null ? '' : `${row.player.lastName} ${row.player.firstName}`;

  return (
    <Dialog open={row !== null} onClose={onClose} aria-labelledby={id} maxWidth="xs" fullWidth>
      <DialogTitle id={id}>{fill(t('students.manage.removeTitle'), { name })}</DialogTitle>
      <DialogContent>
        <Typography>{t('students.manage.removeText')}</Typography>
        {error !== null && error !== undefined && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {t(errorMessageKey(error))}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="text" onClick={onClose} sx={{ minHeight: 44 }}>
          {t('applications.coaches.cancel')}
        </Button>
        <Button
          color="error"
          disabled={pending}
          onClick={() => {
            if (row !== null) onConfirm(row.player.id);
          }}
          sx={{ minHeight: 44 }}
        >
          {t('students.manage.remove')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
