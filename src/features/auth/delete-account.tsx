import { isAppError } from '@kttf/shared/errors';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useId, useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT, type MessageKey } from '@/common/i18n';
import PasswordField from '@/common/ui/password-field';

import { deleteAccount } from './api';
import { useSessionStore } from './session-store';

/** Что стирается и что остаётся — до того, как человек нажмёт «Удалить». */
const CONSEQUENCES: readonly MessageKey[] = [
  'account.delete.what.data',
  'account.delete.what.results',
  'account.delete.what.forum',
  'account.delete.what.phone',
];

const BLOCKED_KEYS: Readonly<Record<string, MessageKey>> = {
  LAST_CLUB_OWNER: 'account.delete.blocked.LAST_CLUB_OWNER',
  LAST_ADMIN: 'account.delete.blocked.LAST_ADMIN',
};

/**
 * Удаление аккаунта — ADR-092. Подтверждается паролем: открытая на чужом
 * устройстве вкладка не должна стирать аккаунт одним нажатием.
 */
export default function DeleteAccountSection(): ReactNode {
  const t = useT();
  const titleId = useId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');

  const remove = useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      useSessionStore.getState().signedOut();
      queryClient.clear();
      await navigate({ to: '/account-deleted', replace: true });
    },
  });

  const wrongPassword = isAppError(remove.error) && remove.error.code === 'WRONG_PASSWORD';
  const failure = remove.error === null || wrongPassword ? null : failureKey(remove.error);

  const close = (): void => {
    setOpen(false);
    setPassword('');
    remove.reset();
  };

  return (
    <Box sx={{ display: 'grid', gap: 2 }} data-delete-account>
      <Typography>{t('account.delete.lead')}</Typography>
      <Consequences />
      <Box>
        <Button
          variant="outlined"
          color="error"
          sx={{ minHeight: 44 }}
          onClick={() => {
            setOpen(true);
          }}
        >
          {t('account.delete.open')}
        </Button>
      </Box>

      <Dialog open={open} onClose={close} aria-labelledby={titleId} fullWidth maxWidth="sm">
        <DialogTitle id={titleId}>{t('account.delete.dialogTitle')}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2 }}>
          <DialogContentText>{t('account.delete.lead')}</DialogContentText>
          <PasswordField
            label={t('account.delete.password')}
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
            }}
            error={wrongPassword}
            helperText={wrongPassword ? t('error.api.WRONG_PASSWORD') : undefined}
            slotProps={{ formHelperText: { role: 'alert' } }}
            sx={{ mt: 1 }}
          />
          {failure !== null && <Alert severity="error">{t(failure)}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="text" autoFocus onClick={close} sx={{ minHeight: 44 }}>
            {t('account.delete.cancel')}
          </Button>
          <Button
            variant="outlined"
            color="error"
            disabled={remove.isPending || password === ''}
            onClick={() => {
              remove.mutate({ password });
            }}
            sx={{ minHeight: 44 }}
          >
            {t('account.delete.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function Consequences(): ReactNode {
  const t = useT();

  return (
    <Box component="ul" sx={{ m: 0, pl: 3, display: 'grid', gap: 0.5 }}>
      {CONSEQUENCES.map((key) => (
        <Typography component="li" variant="body2" color="text.secondary" key={key}>
          {t(key)}
        </Typography>
      ))}
    </Box>
  );
}

/** Отказ «пока нельзя» — со своей причиной, остальное — общим текстом. */
function failureKey(error: Error): MessageKey {
  if (isAppError(error) && error.code === 'ACCOUNT_DELETE_BLOCKED') {
    const reason = error.details?.reason;
    const key = typeof reason === 'string' ? BLOCKED_KEYS[reason] : undefined;

    if (key !== undefined) return key;
  }

  return errorMessageKey(error);
}
