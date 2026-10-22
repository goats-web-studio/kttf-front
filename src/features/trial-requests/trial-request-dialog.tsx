import {
  TRIAL_CHILD_AGE_MAX,
  TRIAL_CHILD_AGE_MIN,
  TRIAL_FOR,
  createTrialRequestSchema,
  type CreateTrialRequestInput,
  type TrainingOwner,
  type TrialFor,
} from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleCheck, ShieldCheck } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { fill, useT } from '@/common/i18n';
import IntegerField from '@/common/ui/integer-field';
import RouterLink from '@/common/ui/router-link';
import { trafficSource } from '@/features/clubs/track';
import { coachShortName } from '@/features/coaches/labels';

import { createTrialRequest } from './api';
import { MY_REQUESTS_HREF, TRIAL_FOR_KEYS } from './inbox';
import { trialRequestKeys } from './queries';

interface TrialRequestDialogProps {
  readonly training: { readonly id: string; readonly title: string };
  /** Кто записывает — ему и уйдёт заявка (`trainingBookingTarget`). */
  readonly target: TrainingOwner;
  readonly open: boolean;
  readonly onClose: () => void;
}

/**
 * Заявка на пробную — второй путь «Записаться» (ADR-059, T3, `docs/11`
 * 3.3.3) для тех, кто не хочет писать сам. Видно, кому уйдёт заявка и что
 * адресат увидит имя и телефон из аккаунта: других контактов KTTF не
 * спрашивает. Источник — тот же, что у нажатий на способы связи.
 *
 * Закрытое окно снимает форму (MUI, `keepMounted` выключен): следующая
 * заявка начинается с чистого листа.
 */
export default function TrialRequestDialog({
  training,
  target,
  open,
  onClose,
}: TrialRequestDialogProps): ReactNode {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  const titleId = useId();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={phone}
      fullWidth
      maxWidth="sm"
      aria-labelledby={titleId}
      data-trial-dialog={training.id}
    >
      <TrialForm titleId={titleId} training={training} target={target} onClose={onClose} />
    </Dialog>
  );
}

function TrialForm({
  titleId,
  training,
  target,
  onClose,
}: {
  readonly titleId: string;
  readonly training: TrialRequestDialogProps['training'];
  readonly target: TrainingOwner;
  readonly onClose: () => void;
}): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const [forWhom, setForWhom] = useState<TrialFor>('SELF');
  const [childAge, setChildAge] = useState<number | null>(null);
  const [preferredTime, setPreferredTime] = useState('');
  const [comment, setComment] = useState('');
  // Ошибки у полей — после первой попытки отправить, не с первого символа.
  const [tried, setTried] = useState(false);

  const input: CreateTrialRequestInput = {
    forWhom,
    ...(forWhom === 'CHILD' && childAge !== null ? { childAge } : {}),
    ...(preferredTime.trim() === '' ? {} : { preferredTime: preferredTime.trim() }),
    ...(comment.trim() === '' ? {} : { comment: comment.trim() }),
    source: trafficSource(),
  };
  // Та же схема, что на сервере: возраст обязателен у заявки за ребёнка.
  const parsed = createTrialRequestSchema.safeParse(input);
  const ageInvalid =
    !parsed.success && parsed.error.issues.some((issue) => issue.path[0] === 'childAge');

  const send = useMutation({
    mutationFn: (body: CreateTrialRequestInput) => createTrialRequest(training.id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: trialRequestKeys.all });
    },
  });

  const targetName =
    target.kind === 'CLUB' ? target.club.name : coachShortName(target.coach.player);

  if (send.isSuccess) {
    return (
      <>
        <DialogContent sx={{ pt: { xs: 5, sm: 4 }, textAlign: 'center' }} data-trial-sent>
          <Box sx={{ color: 'var(--ok)', display: 'flex', justifyContent: 'center' }}>
            <CircleCheck size={40} aria-hidden />
          </Box>
          <Typography id={titleId} variant="h2" component="h2" sx={{ mt: 2 }}>
            {t('trial.form.sentTitle')}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }} role="status">
            {t('trial.form.sentText')}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, flexWrap: 'wrap', gap: 1 }}>
          <Button
            variant="text"
            component={RouterLink}
            href={MY_REQUESTS_HREF}
            sx={{ minHeight: 44 }}
          >
            {t('trial.mine.title')}
          </Button>
          <Button onClick={onClose} sx={{ minHeight: 44 }}>
            {t('trial.form.done')}
          </Button>
        </DialogActions>
      </>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (parsed.success) send.mutate(parsed.data);
      }}
    >
      <DialogTitle id={titleId}>{t('trial.form.title')}</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{training.title}</Typography>
        <Typography color="text.secondary" data-trial-target={target.kind}>
          {fill(t(target.kind === 'CLUB' ? 'trial.form.toClub' : 'trial.form.toCoach'), {
            name: targetName,
          })}
        </Typography>

        <Box sx={{ mt: 3, display: 'grid', gap: 2.5 }}>
          <ForWhom value={forWhom} onChange={setForWhom} />
          {forWhom === 'CHILD' && (
            <IntegerField
              label={t('trial.form.childAge')}
              value={childAge}
              onChange={setChildAge}
              required
              error={tried && ageInvalid}
              helperText={
                tried && ageInvalid
                  ? fill(t('trial.form.childAgeError'), {
                      min: String(TRIAL_CHILD_AGE_MIN),
                      max: String(TRIAL_CHILD_AGE_MAX),
                    })
                  : undefined
              }
              sx={{ maxWidth: { sm: 240 } }}
            />
          )}
          <TextField
            label={t('trial.form.preferredTime')}
            value={preferredTime}
            onChange={(event) => {
              setPreferredTime(event.target.value);
            }}
            helperText={t('trial.form.preferredTimeHint')}
            slotProps={{ htmlInput: { maxLength: 200 } }}
          />
          <TextField
            label={t('trial.form.comment')}
            value={comment}
            onChange={(event) => {
              setComment(event.target.value);
            }}
            helperText={t('trial.form.commentHint')}
            multiline
            minRows={2}
            slotProps={{ htmlInput: { maxLength: 500 } }}
          />
        </Box>

        <Box
          sx={{
            mt: 3,
            p: 2,
            display: 'flex',
            gap: 1.5,
            alignItems: 'flex-start',
            borderRadius: 3,
            bgcolor: 'var(--paper-sunken)',
          }}
        >
          <Box component="span" sx={{ display: 'flex', mt: 0.25, color: 'text.secondary' }}>
            <ShieldCheck size={18} aria-hidden />
          </Box>
          <Typography variant="body2" data-trial-privacy>
            {t(target.kind === 'CLUB' ? 'trial.form.privacyClub' : 'trial.form.privacyCoach')}
          </Typography>
        </Box>

        {send.error !== null && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {t(errorMessageKey(send.error))}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, flexWrap: 'wrap', gap: 1 }}>
        <Button variant="text" onClick={onClose} sx={{ minHeight: 44 }}>
          {t('trial.form.cancel')}
        </Button>
        <Button type="submit" variant="contained" disabled={send.isPending} sx={{ minHeight: 44 }}>
          {send.isPending ? t('common.loading') : t('trial.form.submit')}
        </Button>
      </DialogActions>
    </form>
  );
}

/** Себе или ребёнку — два варианта, кнопками во всю ширину. */
function ForWhom({
  value,
  onChange,
}: {
  readonly value: TrialFor;
  readonly onChange: (value: TrialFor) => void;
}): ReactNode {
  const t = useT();
  const labelId = useId();

  return (
    <Box>
      <Typography id={labelId} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        {t('trial.form.forWhom')}
      </Typography>
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        aria-labelledby={labelId}
        value={value}
        onChange={(_, next: TrialFor | null) => {
          // Повторное нажатие на выбранное не снимает выбор: «для кого» есть всегда.
          if (next !== null) onChange(next);
        }}
      >
        {TRIAL_FOR.map((option) => (
          <ToggleButton key={option} value={option} sx={{ minHeight: 44 }}>
            {t(TRIAL_FOR_KEYS[option])}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}
