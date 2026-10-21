import { setRegistrationCoachSchema, type RegistrationView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';
import CoachField from '@/features/players/coach-field';
import type { CoachOption } from '@/features/players/coach-options';

import { setRegistrationCoach } from './api';
import { tournamentKeys } from './queries';
import { coachInputOf, coachOptionOf } from './registration-coach';

interface CoachDialogProps {
  readonly registration: RegistrationView;
  readonly open: boolean;
  readonly onClose: () => void;
}

/**
 * Тренер на турнире — то же поле, что в анкете (ADR-035, ADR-059): тренер
 * KTTF из списка или имя строкой. Пустое поле — без тренера. Правят сам
 * игрок и организатор, до старта; право проверяет сервер.
 *
 * Закрытый диалог снимает содержимое (MUI, `keepMounted` выключен): поле
 * при каждом открытии начинается с тренера записи, а не с брошенной правки.
 */
export default function CoachDialog({ registration, open, onClose }: CoachDialogProps): ReactNode {
  const id = useId();

  return (
    <Dialog open={open} onClose={onClose} aria-labelledby={id} maxWidth="xs" fullWidth>
      <CoachForm titleId={id} registration={registration} onClose={onClose} />
    </Dialog>
  );
}

function CoachForm({
  titleId,
  registration,
  onClose,
}: {
  readonly titleId: string;
  readonly registration: RegistrationView;
  readonly onClose: () => void;
}): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const [option, setOption] = useState<CoachOption | null>(() => coachOptionOf(registration.coach));
  const input = coachInputOf(option);
  // Вписанное имя длиннее предела сервер отверг бы проверкой схемы: та же
  // схема говорит об этом у поля, до нажатия.
  const invalid = !setRegistrationCoachSchema.safeParse(input).success;

  const save = useMutation({
    mutationFn: () => setRegistrationCoach(registration.tournamentId, registration.id, input),
    onSuccess: async () => {
      onClose();
      // Как у записи и снятия: тренер виден в составе и в результатах.
      await queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!invalid) save.mutate();
      }}
    >
      <DialogTitle id={titleId}>{t('registration.coach.title')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('registration.coach.lead')}
        </Typography>
        <CoachField
          value={option}
          onChange={setOption}
          label={t('player.form.coachFind')}
          error={invalid ? 'error.form.coach' : undefined}
        />
        {save.error !== null && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {t(errorMessageKey(save.error))}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="text" onClick={onClose} sx={{ minHeight: 44 }}>
          {t('registration.coach.cancel')}
        </Button>
        <Button type="submit" disabled={invalid || save.isPending} sx={{ minHeight: 44 }}>
          {save.isPending ? t('common.loading') : t('registration.coach.save')}
        </Button>
      </DialogActions>
    </form>
  );
}
