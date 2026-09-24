import { zodResolver } from '@hookform/resolvers/zod';
import {
  localeSchema,
  updateAccountSchema,
  type AuthUserView,
  type UpdateAccountInput,
} from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useMutation } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { errorMessageKey } from '@/common/api';
import { useT, type MessageKey } from '@/common/i18n';
import { updateAccount } from '@/features/auth/api';
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

/** Ошибка поля объявляется сразу, как и до перехода на MUI (раздел 9). */
const ANNOUNCED = { formHelperText: { role: 'alert' } } as const;

/**
 * Настройки аккаунта — ТЗ 2.1, ADR-035.
 *
 * Логин, почта, язык и Telegram — то, чем человек входит и как с ним
 * связаться. Спортивная анкета правится профилем игрока: сущности разные,
 * и у судьи аккаунт есть, а профиля нет.
 *
 * Телефон показывается, но не правится: по ТЗ 2.1 «один телефон — один
 * аккаунт», и смена номера требует подтверждения владения новым, которого
 * без SMS взять неоткуда (ADR-034). Это задача поддержки, а не формы.
 */
export default function AccountForm({ user }: { readonly user: AuthUserView }): ReactNode {
  const t = useT();
  const userChanged = useSessionStore((state) => state.userChanged);

  const form = useForm({
    resolver: zodResolver(updateAccountSchema),
    defaultValues: {
      login: user.login ?? '',
      email: user.email ?? '',
      locale: isLocale(user.locale) ? user.locale : 'RU',
      telegramId: user.telegramId ?? '',
    },
  });

  const save = useMutation({
    mutationFn: (values: UpdateAccountInput) => updateAccount(values),
    onSuccess: (updated) => {
      // Сессия несёт в себе аккаунт: без обновления шапка показывала бы
      // прежний логин до перезагрузки страницы.
      userChanged(updated);
      form.reset({
        login: updated.login ?? '',
        email: updated.email ?? '',
        locale: isLocale(updated.locale) ? updated.locale : 'RU',
        telegramId: updated.telegramId ?? '',
      });
    },
  });

  /**
   * Пустое поле — «не задано», а не пустая строка.
   *
   * Схема ждёт почту почтой и Telegram числом: незаполненное поле иначе
   * не проходит проверку, и форма молча отказывается отправляться.
   */
  const optional = { setValueAs: (value: string) => (value === '' ? undefined : value) };

  const { errors } = form.formState;
  const { ref: loginRef, ...login } = form.register('login', optional);
  const { ref: emailRef, ...email } = form.register('email', optional);
  const { ref: telegramRef, ...telegram } = form.register('telegramId', optional);

  return (
    <Stack
      component="form"
      spacing={2}
      noValidate
      sx={{ mt: 2, alignItems: 'flex-start' }}
      onSubmit={(event) => {
        void form.handleSubmit((values) => {
          // Пустое поле — «стереть», а не «не трогать»: форма отдаёт
          // настройки целиком, и без этого убрать почту было бы нечем.
          save.mutate({
            ...(values.login === undefined || values.login === '' ? {} : { login: values.login }),
            email: values.email === undefined || values.email === '' ? null : values.email,
            ...(values.locale === undefined ? {} : { locale: values.locale }),
            telegramId:
              values.telegramId === undefined || values.telegramId === ''
                ? null
                : values.telegramId,
          });
        })(event);
      }}
    >
      <Box sx={{ ...GRID, width: '100%' }}>
        <TextField
          {...login}
          inputRef={loginRef}
          label={t('account.form.login')}
          autoComplete="username"
          sx={TOUCH}
          error={errors.login !== undefined}
          helperText={errors.login === undefined ? undefined : t('error.form.login')}
          slotProps={ANNOUNCED}
        />

        <TextField
          {...email}
          inputRef={emailRef}
          label={<Optional label="account.form.email" />}
          type="email"
          autoComplete="email"
          sx={TOUCH}
          error={errors.email !== undefined}
          helperText={errors.email === undefined ? undefined : t('error.form.email')}
          slotProps={ANNOUNCED}
        />

        <Controller
          control={form.control}
          name="locale"
          render={({ field: { ref, value, ...field } }) => (
            <TextField
              {...field}
              inputRef={ref}
              value={value ?? ''}
              select
              label={t('account.form.locale')}
              sx={TOUCH}
            >
              {localeSchema.options.map((option) => (
                <MenuItem key={option} value={option}>
                  {t(LOCALE_KEYS[option])}
                </MenuItem>
              ))}
            </TextField>
          )}
        />

        <TextField
          {...telegram}
          inputRef={telegramRef}
          label={<Optional label="account.form.telegram" />}
          sx={TOUCH}
          error={errors.telegramId !== undefined}
          helperText={
            errors.telegramId === undefined
              ? t('account.form.telegramHint')
              : t('error.form.telegram')
          }
          slotProps={{
            htmlInput: { inputMode: 'numeric' },
            ...(errors.telegramId === undefined ? {} : ANNOUNCED),
          }}
        />
      </Box>

      {save.error !== null && (
        <Alert severity="error" sx={{ width: '100%' }}>
          {t(errorMessageKey(save.error))}
        </Alert>
      )}

      {save.isSuccess && !form.formState.isDirty && (
        <Alert severity="success" role="status" sx={{ width: '100%' }}>
          {t('account.form.saved')}
        </Alert>
      )}

      {/* Не `contained`: главное действие кабинета — профиль игрока, а
          главная кнопка на экране одна (запрет №2). */}
      <Button type="submit" loading={save.isPending} loadingPosition="start">
        {t('account.form.save')}
      </Button>
    </Stack>
  );
}

function isLocale(value: string): value is UpdateAccountInput['locale'] & string {
  return localeSchema.options.some((option) => option === value);
}

const LOCALE_KEYS: Readonly<Record<'RU' | 'KK' | 'EN', MessageKey>> = {
  RU: 'account.locale.RU',
  KK: 'account.locale.KK',
  EN: 'account.locale.EN',
};

/** Подпись необязательного поля: пометка мельче и тише самой подписи. */
function Optional({ label }: { readonly label: MessageKey }): ReactNode {
  const t = useT();

  return (
    <>
      {t(label)}{' '}
      <Box component="span" sx={{ typography: 'caption', color: 'text.secondary' }}>
        {t('player.form.optional')}
      </Box>
    </>
  );
}
