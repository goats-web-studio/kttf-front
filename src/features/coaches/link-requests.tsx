import type { TrainingLink, TrainingView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Clock, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT, type MessageKey } from '@/common/i18n';

import { confirmTraining, declineTraining } from './api';
import { Badge } from './coach-cards';
import { coachKeys } from './queries';
import { TrainingRow } from './training-list';

/** Статус связи у строки кабинета: ждёт, подтверждено, отклонено. */
export function LinkStatus({
  link,
  keys,
}: {
  readonly link: TrainingLink;
  readonly keys: Readonly<Record<Exclude<TrainingLink, 'NONE'>, MessageKey>>;
}): ReactNode {
  const t = useT();

  if (link === 'NONE') return null;

  const Icon = link === 'CONFIRMED' ? BadgeCheck : link === 'PENDING' ? Clock : XCircle;

  return (
    <Badge tone={link === 'CONFIRMED' ? 'ok' : 'warn'}>
      <Icon size={14} aria-hidden />
      {t(keys[link])}
    </Badge>
  );
}

/**
 * Связи, ждущие ответа этой стороны, или подтверждённые чужие тренировки —
 * строками с действиями (ADR-059: подтверждает вторая сторона, разорвать
 * может любая). `confirm` — только у входящих; «Отклонить» у входящих и
 * «Отказаться» или «Убрать» у подтверждённых — один маршрут `decline`.
 */
export function LinkedTrainings({
  title,
  lead,
  trainings,
  confirm,
  declineLabel,
  showCoach,
}: {
  readonly title: string;
  readonly lead: string;
  readonly trainings: readonly TrainingView[];
  readonly confirm: boolean;
  readonly declineLabel: string;
  readonly showCoach: boolean;
}): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const refresh = (): Promise<void> => queryClient.invalidateQueries({ queryKey: coachKeys.all });
  const accept = useMutation({ mutationFn: confirmTraining, onSuccess: refresh });
  const decline = useMutation({ mutationFn: declineTraining, onSuccess: refresh });
  const busy = (id: string): boolean =>
    (accept.isPending && accept.variables === id) ||
    (decline.isPending && decline.variables === id);
  const error = accept.error ?? decline.error;

  if (trainings.length === 0) return null;

  return (
    <Paper
      variant="outlined"
      component="section"
      data-linked-trainings={confirm ? 'requests' : 'confirmed'}
      sx={{ mt: 3, p: { xs: 2.5, sm: 4 } }}
    >
      <Typography variant="h2">{title}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 680 }}>
        {lead}
      </Typography>
      <Box
        component="ul"
        sx={{
          m: 0,
          mt: 2,
          p: 0,
          listStyle: 'none',
          border: 1,
          borderColor: 'divider',
          borderRadius: 3,
        }}
      >
        {trainings.map((training) => (
          <Box
            key={training.id}
            component="li"
            sx={{ borderTop: 1, borderColor: 'divider', '&:first-of-type': { borderTop: 0 } }}
          >
            <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
              <TrainingRow
                training={training}
                context={showCoach ? 'club' : 'coach'}
                showPlace={!showCoach}
                actions={false}
              />
            </Box>
            <Box sx={{ px: { xs: 2, sm: 3 }, pb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {confirm && (
                <Button
                  disabled={busy(training.id)}
                  onClick={() => {
                    accept.mutate(training.id);
                  }}
                  sx={{ minHeight: 44 }}
                >
                  {t('training.link.confirm')}
                </Button>
              )}
              <Button
                variant="text"
                color="error"
                disabled={busy(training.id)}
                onClick={() => {
                  decline.mutate(training.id);
                }}
                sx={{ minHeight: 44 }}
              >
                {declineLabel}
              </Button>
            </Box>
          </Box>
        ))}
      </Box>
      {error !== null && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t(errorMessageKey(error))}
        </Alert>
      )}
    </Paper>
  );
}
