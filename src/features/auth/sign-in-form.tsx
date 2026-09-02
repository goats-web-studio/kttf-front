import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@kttf/shared/types';
import { useMutation } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';

import { signIn } from './api';
import { useSessionStore } from './session-store';

interface SignInFormProps {
  readonly onSignedIn: () => void;
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
export default function SignInForm({ onSignedIn }: SignInFormProps): ReactNode {
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

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        void form.handleSubmit((values) => {
          login.mutate(values);
        })(event);
      }}
    >
      <p className="text-slate-600">{t('login.lead')}</p>

      <label className="block">
        <span className="text-sm text-slate-700">{t('login.identifier.label')}</span>
        <input
          {...form.register('identifier')}
          autoComplete="username"
          placeholder={t('login.identifier.placeholder')}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm text-slate-700">{t('login.password.label')}</span>
        <input
          {...form.register('password')}
          type="password"
          autoComplete="current-password"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
        />
      </label>

      {(form.formState.errors.identifier !== undefined ||
        form.formState.errors.password !== undefined) && (
        <p role="alert" className="text-sm text-red-700">
          {t('error.form.credentials')}
        </p>
      )}
      {login.error !== null && (
        <p role="alert" className="text-sm text-red-700">
          {t(errorMessageKey(login.error))}
        </p>
      )}

      <button
        type="submit"
        disabled={login.isPending}
        className="w-full rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
      >
        {login.isPending ? t('common.loading') : t('login.submit')}
      </button>

      <p className="text-sm text-slate-600">
        {t('login.noAccount')}{' '}
        <Link to="/sign-up" className="text-blue-700 underline">
          {t('login.signUp')}
        </Link>
      </p>
    </form>
  );
}
