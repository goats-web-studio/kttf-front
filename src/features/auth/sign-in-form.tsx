import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { useT, type MessageKey } from '@/common/i18n';
import { toE164 } from '@/common/phone';
import PasswordField from '@/common/ui/password-field';
import PhoneField from '@/common/ui/phone-field';
import PillTabs from '@/common/ui/pill-tabs';

import { signIn } from './api';
import { loginErrorText } from './login-error';
import { useSessionStore } from './session-store';

interface SignInFormProps {
  readonly onSignedIn: () => void;
  /** Ссылка «Зарегистрироваться» — с адресом возврата, если он есть. */
  readonly signUpHref?: string;
}

type Method = 'phone' | 'login';

/** Способ входа запоминается: человек входит одним и тем же способом. */
const METHOD_KEY = 'kttf.login-method';

function savedMethod(): Method {
  return localStorage.getItem(METHOD_KEY) === 'login' ? 'login' : 'phone';
}

/**
 * Вход — ТЗ 2.1, ADR-034: по телефону или по логину, отдельными вкладками.
 *
 * Телефон первым: в Казахстане его помнят все, логин — не все. У каждого
 * способа своё поле: у телефона — маска `+7 (701) 123-45-67`, у логина —
 * обычная строка. Сервер принимает оба в одном поле `identifier`.
 */
export default function SignInForm({
  onSignedIn,
  signUpHref = '/sign-up',
}: SignInFormProps): ReactNode {
  const t = useT();
  const [method, setMethod] = useState<Method>(savedMethod);

  return (
    <Stack spacing={2.5}>
      <PillTabs
        label={t('login.method.label')}
        value={method}
        options={[
          ['phone', 'login.method.phone'],
          ['login', 'login.method.login'],
        ]}
        onChange={(next) => {
          localStorage.setItem(METHOD_KEY, next);
          setMethod(next);
        }}
      />

      {/* Ключом — чтобы при смене способа поля и ошибки начинались с чистого листа. */}
      <Credentials key={method} method={method} onSignedIn={onSignedIn} />

      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
        {t('login.noAccount')} <Link href={signUpHref}>{t('login.signUp')}</Link>
      </Typography>
    </Stack>
  );
}

/** Проверяется только поле выбранного способа; длину пароля проверяет сервер. */
function credentialsSchema(method: Method) {
  return z
    .object({ phone: z.string(), login: z.string(), password: z.string() })
    .superRefine((values, context) => {
      if (method === 'phone' && toE164(values.phone) === null) {
        context.addIssue({ code: 'custom', path: ['phone'], message: 'phone' });
      }

      if (method === 'login' && values.login.trim() === '') {
        context.addIssue({ code: 'custom', path: ['login'], message: 'login' });
      }

      if (values.password === '') {
        context.addIssue({ code: 'custom', path: ['password'], message: 'password' });
      }
    });
}

/** Ошибка поля объявляется сразу (раздел 9 дизайн-системы). */
const ANNOUNCED = { formHelperText: { role: 'alert' } } as const;

function Credentials({
  method,
  onSignedIn,
}: {
  readonly method: Method;
  readonly onSignedIn: () => void;
}): ReactNode {
  const t = useT();
  const signedIn = useSessionStore((state) => state.signedIn);

  const form = useForm({
    resolver: zodResolver(credentialsSchema(method)),
    defaultValues: { phone: '', login: '', password: '' },
  });

  const login = useMutation({
    mutationFn: signIn,
    onSuccess: (session) => {
      signedIn(session);
      onSignedIn();
    },
  });

  const { errors } = form.formState;
  const helper = (failed: boolean, key: MessageKey): string | undefined =>
    failed ? t(key) : undefined;
  const { ref: loginRef, ...loginField } = form.register('login');
  const { ref: passwordRef, ...password } = form.register('password');

  return (
    <Stack
      component="form"
      spacing={2}
      noValidate
      onSubmit={(event) => {
        void form.handleSubmit((values) => {
          const identifier = method === 'phone' ? toE164(values.phone) : values.login.trim();

          if (identifier !== null) {
            login.mutate({ identifier, password: values.password });
          }
        })(event);
      }}
    >
      {method === 'phone' ? (
        <Controller
          control={form.control}
          name="phone"
          render={({ field }) => (
            <PhoneField
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              inputRef={field.ref}
              label={t('login.phone.label')}
              autoFocus
              size="medium"
              error={errors.phone !== undefined}
              helperText={helper(errors.phone !== undefined, 'error.form.phone')}
              slotProps={ANNOUNCED}
            />
          )}
        />
      ) : (
        <TextField
          {...loginField}
          inputRef={loginRef}
          label={t('login.login.label')}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
          size="medium"
          error={errors.login !== undefined}
          helperText={helper(errors.login !== undefined, 'error.form.loginEmpty')}
          slotProps={ANNOUNCED}
        />
      )}

      <PasswordField
        {...password}
        inputRef={passwordRef}
        label={t('login.password.label')}
        autoComplete="current-password"
        size="medium"
        error={errors.password !== undefined}
        helperText={helper(errors.password !== undefined, 'error.form.passwordEmpty')}
        slotProps={ANNOUNCED}
      />

      {login.error !== null && <Alert severity="error">{loginErrorText(login.error, t)}</Alert>}

      <Button
        variant="contained"
        type="submit"
        size="large"
        fullWidth
        loading={login.isPending}
        loadingPosition="start"
        sx={{ minHeight: 48 }}
      >
        {t('login.submit')}
      </Button>
    </Stack>
  );
}
