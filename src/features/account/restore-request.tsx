import { isAppError } from '@kttf/shared/errors';
import type { AccountStatusView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { fill, formatDate, useLocale, useT, type MessageKey } from '@/common/i18n';
import Surface from '@/common/ui/surface';

import { requestAccountRestore } from './api';
import { accountRequestKeys, accountStatusQuery } from './queries';
import RejectedNote from './rejected-note';

const INVALID_KEYS: Readonly<Record<string, MessageKey>> = {
  NOTHING_ARCHIVED: 'account.restore.invalid.NOTHING_ARCHIVED',
  HAS_PROFILE: 'account.restore.invalid.HAS_PROFILE',
  PROFILE_TAKEN: 'account.restore.invalid.PROFILE_TAKEN',
};

/**
 * Восстановление архивного профиля — ADR-095, п. 5.
 *
 * Новый аккаунт с номером, под которым раньше играл ушедший в архив
 * профиль, видит это первым делом: иначе человек заведёт анкету с нуля и
 * потеряет свою историю. Номер без SMS не подтверждён (ADR-034), поэтому
 * историю привязывает администратор — здесь только заявка.
 *
 * Ничего нет в архиве и нет заявки — блока нет.
 */
export default function RestoreRequestBlock(): ReactNode {
  const t = useT();
  const locale = useLocale();
  const status = useQuery(accountStatusQuery);
  const data = status.data;

  if (data === undefined) return null;

  const restore = data.restore;

  if (restore?.status === 'PENDING') {
    return (
      <Surface title={t('account.restore.title')}>
        <Alert severity="info" data-restore-pending>
          {fill(t('account.restore.pending'), { date: formatDate(restore.createdAt, locale) })}
        </Alert>
      </Surface>
    );
  }

  if (!data.restorable) return null;

  return (
    <Surface title={t('account.restore.title')}>
      <Box sx={{ display: 'grid', gap: 2 }} data-restore-request>
        <Typography>{t('account.restore.lead')}</Typography>
        <Typography variant="body2" color="text.secondary">
          {data.restorableWithData
            ? t('account.restore.withData')
            : t('account.restore.historyOnly')}
        </Typography>
        {restore?.status === 'REJECTED' && (
          <RejectedNote
            title={t('account.restore.rejected')}
            date={restore.createdAt}
            answer={restore.answer}
          />
        )}
        <RestoreForm />
      </Box>
    </Surface>
  );
}

function RestoreForm(): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [comment, setComment] = useState('');

  const send = useMutation({
    mutationFn: requestAccountRestore,
    onSuccess: (created) => {
      queryClient.setQueryData<AccountStatusView>(accountRequestKeys.status, (previous) =>
        previous === undefined ? previous : { ...previous, restore: created },
      );
      return queryClient.invalidateQueries({ queryKey: accountRequestKeys.status });
    },
  });

  const valid = lastName.trim() !== '' && firstName.trim() !== '';

  return (
    <Box
      component="form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid || send.isPending) return;
        const note = comment.trim();
        send.mutate({
          lastName: lastName.trim(),
          firstName: firstName.trim(),
          ...(note === '' ? {} : { comment: note }),
        });
      }}
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
      }}
    >
      <TextField
        label={t('account.restore.lastName')}
        value={lastName}
        onChange={(event) => {
          setLastName(event.target.value);
        }}
        required
        autoComplete="family-name"
        slotProps={{ htmlInput: { maxLength: 100 } }}
      />
      <TextField
        label={t('account.restore.firstName')}
        value={firstName}
        onChange={(event) => {
          setFirstName(event.target.value);
        }}
        required
        autoComplete="given-name"
        slotProps={{ htmlInput: { maxLength: 100 } }}
      />
      <TextField
        label={t('account.restore.comment')}
        value={comment}
        onChange={(event) => {
          setComment(event.target.value);
        }}
        multiline
        minRows={2}
        slotProps={{ htmlInput: { maxLength: 500 } }}
        sx={{ gridColumn: '1 / -1' }}
      />
      {send.error !== null && (
        <Alert severity="error" sx={{ gridColumn: '1 / -1' }}>
          {t(failureKey(send.error))}
        </Alert>
      )}
      <Box sx={{ gridColumn: '1 / -1' }}>
        <Button
          type="submit"
          variant="contained"
          disabled={!valid || send.isPending}
          sx={{ minHeight: 44 }}
        >
          {t('account.restore.submit')}
        </Button>
      </Box>
    </Box>
  );
}

/** Почему восстановить нельзя — своей причиной, остальное — общим текстом. */
function failureKey(error: Error): MessageKey {
  if (isAppError(error) && error.code === 'ACCOUNT_RESTORE_INVALID') {
    const reason = error.details?.reason;
    const key = typeof reason === 'string' ? INVALID_KEYS[reason] : undefined;

    if (key !== undefined) return key;
  }

  return errorMessageKey(error);
}
