import { isAppError } from '@kttf/shared/errors';
import { ARCHIVE_PERSONAL_DATA_DAYS, type AccountStatusView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { fill, formatDate, useLocale, useT, type MessageKey } from '@/common/i18n';
import PasswordField from '@/common/ui/password-field';
import { requestAccountDeletion, withdrawAccountDeletion } from '@/features/account/api';
import { accountRequestKeys, accountStatusQuery } from '@/features/account/queries';
import RejectedNote from '@/features/account/rejected-note';

/**
 * Что будет после одобрения — до того, как человек нажмёт «Запросить».
 * Последний пункт — что историю можно вернуть: без него заявка выглядит
 * необратимой, и человек, который хочет просто «пропасть на время»,
 * боится её отправить.
 */
const CONSEQUENCES: readonly MessageKey[] = [
  'account.delete.what.closed',
  'account.delete.what.results',
  'account.delete.what.forum',
  'account.delete.what.archive',
  'account.delete.what.restore',
];

const BLOCKED_KEYS: Readonly<Record<string, MessageKey>> = {
  LAST_CLUB_OWNER: 'account.delete.blocked.LAST_CLUB_OWNER',
  LAST_ADMIN: 'account.delete.blocked.LAST_ADMIN',
};

/**
 * Удаление аккаунта заявкой — ADR-095 (заменяет самоудаление ADR-092).
 *
 * Сам себя человек не удаляет: просит, решает администратор. Право отозвать
 * согласие (Закон РК № 94-V) обязывает принимать такие просьбы, поэтому
 * заявка подаётся отсюда, а не письмом. Состояние берётся с сервера: заявка
 * могла уйти с другого устройства.
 */
export default function DeleteAccountSection(): ReactNode {
  const t = useT();
  const status = useQuery(accountStatusQuery);
  const deletion = status.data?.deletion ?? null;

  return (
    <Box sx={{ display: 'grid', gap: 2 }} data-delete-account>
      <Typography>{t('account.delete.lead')}</Typography>
      <Consequences />
      {status.isPending ? null : deletion?.status === 'PENDING' ? (
        <PendingDeletion createdAt={deletion.createdAt} />
      ) : (
        <>
          {deletion?.status === 'REJECTED' && (
            <RejectedNote
              title={t('account.delete.rejected')}
              date={deletion.createdAt}
              answer={deletion.answer}
            />
          )}
          <RequestDeletion />
        </>
      )}
    </Box>
  );
}

function Consequences(): ReactNode {
  const t = useT();

  return (
    <Box component="ul" sx={{ m: 0, pl: 3, display: 'grid', gap: 0.5 }}>
      {CONSEQUENCES.map((key) => (
        <Typography component="li" variant="body2" color="text.secondary" key={key}>
          {fill(t(key), { days: String(ARCHIVE_PERSONAL_DATA_DAYS) })}
        </Typography>
      ))}
    </Box>
  );
}

/** Заявка ждёт решения: когда отправлена и как её отозвать. */
function PendingDeletion({ createdAt }: { readonly createdAt: string }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();

  const withdraw = useMutation({
    mutationFn: withdrawAccountDeletion,
    onSuccess: () => {
      // Заявки больше нет — сразу снова кнопка «Запросить удаление», без
      // ожидания повторного запроса.
      queryClient.setQueryData<AccountStatusView>(accountRequestKeys.status, (previous) =>
        previous === undefined ? previous : { ...previous, deletion: null },
      );
      return queryClient.invalidateQueries({ queryKey: accountRequestKeys.status });
    },
  });

  return (
    <Alert
      severity="info"
      data-deletion-pending
      action={
        <Button
          color="inherit"
          disabled={withdraw.isPending}
          onClick={() => {
            withdraw.mutate();
          }}
          sx={{ minHeight: 44 }}
        >
          {t('account.delete.withdraw')}
        </Button>
      }
    >
      <Typography sx={{ fontWeight: 700 }}>{t('account.delete.pending.title')}</Typography>
      <Typography variant="body2">
        {fill(t('account.delete.pending.text'), { date: formatDate(createdAt, locale) })}
      </Typography>
      {withdraw.error !== null && (
        <Typography variant="body2" role="alert" sx={{ mt: 1 }}>
          {t(errorMessageKey(withdraw.error))}
        </Typography>
      )}
    </Alert>
  );
}

/**
 * Кнопка и диалог заявки. Пароль — повторная проверка личности: открытая на
 * чужом устройстве вкладка не должна отправлять заявку одним нажатием.
 */
function RequestDeletion(): ReactNode {
  const t = useT();
  const titleId = useId();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');

  const request = useMutation({
    mutationFn: requestAccountDeletion,
    onSuccess: (created) => {
      queryClient.setQueryData<AccountStatusView>(accountRequestKeys.status, (previous) =>
        previous === undefined ? previous : { ...previous, deletion: created },
      );
      close();
      return queryClient.invalidateQueries({ queryKey: accountRequestKeys.status });
    },
  });

  const wrongPassword = isAppError(request.error) && request.error.code === 'WRONG_PASSWORD';
  const failure = request.error === null || wrongPassword ? null : failureKey(request.error);

  function close(): void {
    setOpen(false);
    setPassword('');
    setReason('');
    request.reset();
  }

  return (
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

      <Dialog open={open} onClose={close} aria-labelledby={titleId} fullWidth maxWidth="sm">
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (password === '' || request.isPending) return;
            const trimmed = reason.trim();
            request.mutate({ password, ...(trimmed === '' ? {} : { reason: trimmed }) });
          }}
        >
          <DialogTitle id={titleId}>{t('account.delete.dialogTitle')}</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2 }}>
            <DialogContentText>{t('account.delete.dialogText')}</DialogContentText>
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
            <TextField
              label={t('account.delete.reason')}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
              }}
              multiline
              minRows={2}
              slotProps={{ htmlInput: { maxLength: 500 } }}
            />
            {failure !== null && <Alert severity="error">{t(failure)}</Alert>}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Button variant="text" autoFocus onClick={close} sx={{ minHeight: 44 }}>
              {t('account.delete.cancel')}
            </Button>
            <Button
              type="submit"
              variant="outlined"
              color="error"
              disabled={request.isPending || password === ''}
              sx={{ minHeight: 44 }}
            >
              {t('account.delete.confirm')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
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
