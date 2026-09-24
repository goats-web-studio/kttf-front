import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema, type ChangePasswordInput } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useMutation } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';
import { changePassword } from '@/features/auth/api';
import { useSessionStore } from '@/features/auth/session-store';

/** Два поля в ряд с 640px, на телефоне — столбиком. */
const GRID = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  alignItems: 'start',
} as const;

/** Поле на телефоне не ниже 44px — зона нажатия (раздел 9). */
const TOUCH = { '& .MuiInputBase-root': { minHeight: { xs: 44, sm: 40 } } } as const;

/**
 * Смена пароля — ТЗ 2.1.
 *
 * Текущий пароль обязателен: без него доступ к открытой вкладке означал бы
 * возможность отобрать аккаунт у владельца.
 *
 * Сервер обрывает остальные сессии и выдаёт новую пару токенов — её нужно
 * положить в хранилище, иначе вкладка, из которой пароль сменили, умрёт
 * вместе с оборванными сессиями.
 */
export default function PasswordForm(): ReactNode {
  const t = useT();
  const tokensRefreshed = useSessionStore((state) => state.tokensRefreshed);

  const form = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  });

  const change = useMutation({
    mutationFn: (values: ChangePasswordInput) => changePassword(values),
    onSuccess: (tokens) => {
      tokensRefreshed(tokens.accessToken, tokens.refreshToken);
      form.reset();
    },
  });

  const { errors } = form.formState;
  const { ref: currentRef, ...current } = form.register('currentPassword');
  const { ref: nextRef, ...next } = form.register('newPassword');

  return (
    <Stack
      component="form"
      spacing={2}
      noValidate
      sx={{ mt: 2, alignItems: 'flex-start' }}
      onSubmit={(event) => {
        void form.handleSubmit((values) => {
          change.mutate(values);
        })(event);
      }}
    >
      <Box sx={{ ...GRID, width: '100%' }}>
        <TextField
          {...current}
          inputRef={currentRef}
          label={t('account.password.current')}
          type="password"
          autoComplete="current-password"
          sx={TOUCH}
        />

        <TextField
          {...next}
          inputRef={nextRef}
          label={t('account.password.next')}
          type="password"
          autoComplete="new-password"
          sx={TOUCH}
          error={errors.newPassword !== undefined}
          helperText={errors.newPassword === undefined ? undefined : t('error.form.password')}
          slotProps={{ formHelperText: { role: 'alert' } }}
        />
      </Box>

      {change.error !== null && (
        <Alert severity="error" sx={{ width: '100%' }}>
          {t(errorMessageKey(change.error))}
        </Alert>
      )}

      {change.isSuccess && (
        <Alert severity="success" role="status" sx={{ width: '100%' }}>
          {t('account.password.changed')}
        </Alert>
      )}

      {/* Не `contained`: главная кнопка на экране кабинета одна (запрет №2). */}
      <Button type="submit" loading={change.isPending} loadingPosition="start">
        {t('account.password.submit')}
      </Button>
    </Stack>
  );
}
