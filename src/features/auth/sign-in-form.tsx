import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';

import { useT } from '@/common/i18n';

import { signIn } from './api';
import { loginErrorText } from './login-error';
import { useSessionStore } from './session-store';

interface SignInFormProps {
  readonly onSignedIn: () => void;
  /** Ссылка «Зарегистрироваться» — с адресом возврата, если он есть. */
  readonly signUpHref?: string;
}

/**
 * Вход логином или телефоном — ТЗ 2.1, ADR-034.
 *
 * Поле ввода одно на оба: человек вводит то, что помнит, а разбирает сервер.
 * Два поля означали бы выбор способа входа до того, как человек начал вводить.
 *
 * Тексты ошибок берутся из словаря, а не из схемы: сообщения внутри схем
 * общие с сервером и не локализуются — бриф 3.4.
 */
export default function SignInForm({
  onSignedIn,
  signUpHref = '/sign-up',
}: SignInFormProps): ReactNode {
  const t = useT();
  const signedIn = useSessionStore((state) => state.signedIn);

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const login = useMutation({
    mutationFn: signIn,
    onSuccess: (session) => {
      signedIn(session);
      onSignedIn();
    },
  });

  const { errors } = form.formState;
  const { ref: identifierRef, ...identifier } = form.register('identifier');
  const { ref: passwordRef, ...password } = form.register('password');

  return (
    <Stack
      component="form"
      spacing={2}
      noValidate
      onSubmit={(event) => {
        void form.handleSubmit((values) => {
          login.mutate(values);
        })(event);
      }}
    >
      <Typography color="text.secondary">{t('login.lead')}</Typography>

      <TextField
        {...identifier}
        inputRef={identifierRef}
        label={t('login.identifier.label')}
        placeholder={t('login.identifier.placeholder')}
        autoComplete="username"
        size="medium"
        error={errors.identifier !== undefined}
      />

      <TextField
        {...password}
        inputRef={passwordRef}
        label={t('login.password.label')}
        type="password"
        autoComplete="current-password"
        size="medium"
        error={errors.password !== undefined}
      />

      {/* Одно сообщение на оба поля: какое из них не так, форма не выдаёт. */}
      {(errors.identifier !== undefined || errors.password !== undefined) && (
        <Alert severity="error">{t('error.form.credentials')}</Alert>
      )}
      {login.error !== null && <Alert severity="error">{loginErrorText(login.error, t)}</Alert>}

      <Button
        variant="contained"
        type="submit"
        size="large"
        fullWidth
        loading={login.isPending}
        loadingPosition="start"
      >
        {t('login.submit')}
      </Button>

      <Typography variant="body2" color="text.secondary">
        {t('login.noAccount')} <Link href={signUpHref}>{t('login.signUp')}</Link>
      </Typography>
    </Stack>
  );
}
