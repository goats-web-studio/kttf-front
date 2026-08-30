import { zodResolver } from '@hookform/resolvers/zod';
import { requestCodeSchema, verifyCodeSchema, type AuthSession } from '@kttf/shared/types';
import { useMutation } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { useForm } from 'react-hook-form';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';

import { requestCode, verifyCode } from './api';
import { useSessionStore } from './session-store';

const codeSchema = verifyCodeSchema.pick({ code: true });

interface SignInFormProps {
  readonly onSignedIn: () => void;
}

/**
 * Вход по одноразовому коду — ТЗ 2.1, контракт ТС 7.1.
 *
 * Два шага в одном экране: адрес без телефона бессмыслен, а отдельный
 * маршрут под ввод кода открывался бы пустым при перезагрузке.
 *
 * Тексты ошибок берутся из словаря, а не из схемы: сообщения внутри схем
 * общие с сервером и не локализуются — бриф 3.4.
 */
export default function SignInForm({ onSignedIn }: SignInFormProps): ReactNode {
  const t = useT();
  const signedIn = useSessionStore((state) => state.signedIn);
  const [phone, setPhone] = useState<string | null>(null);

  const phoneForm = useForm({
    resolver: zodResolver(requestCodeSchema),
    defaultValues: { phone: '' },
  });

  const codeForm = useForm({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  });

  const request = useMutation({
    mutationFn: (value: string) => requestCode(value),
    onSuccess: (_result, value) => {
      setPhone(value);
    },
  });

  const verify = useMutation({
    mutationFn: (code: string): Promise<AuthSession> => {
      if (phone === null) {
        throw new Error('Шаг ввода кода открыт без телефона');
      }

      return verifyCode({ phone, code });
    },
    onSuccess: (session) => {
      signedIn(session);
      onSignedIn();
    },
  });

  if (phone === null) {
    return (
      <form
        className="space-y-4"
        onSubmit={(event) => {
          void phoneForm.handleSubmit((values) => {
            request.mutate(values.phone);
          })(event);
        }}
      >
        <p className="text-slate-600">{t('login.lead')}</p>

        <label className="block">
          <span className="text-sm text-slate-700">{t('login.phone.label')}</span>
          <input
            {...phoneForm.register('phone')}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={t('login.phone.placeholder')}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>

        {phoneForm.formState.errors.phone !== undefined && (
          <p role="alert" className="text-sm text-red-700">
            {t('error.form.phone')}
          </p>
        )}
        {request.error !== null && (
          <p role="alert" className="text-sm text-red-700">
            {t(errorMessageKey(request.error))}
          </p>
        )}

        <button
          type="submit"
          disabled={request.isPending}
          className="w-full rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
        >
          {request.isPending ? t('common.loading') : t('login.submit.requestCode')}
        </button>
      </form>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        void codeForm.handleSubmit((values) => {
          verify.mutate(values.code);
        })(event);
      }}
    >
      <p className="text-slate-600">
        {t('login.code.sent')} <span className="font-medium text-slate-900">{phone}</span>
      </p>

      <label className="block">
        <span className="text-sm text-slate-700">{t('login.code.label')}</span>
        <input
          {...codeForm.register('code')}
          inputMode="numeric"
          autoComplete="one-time-code"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 tracking-widest"
        />
      </label>

      {codeForm.formState.errors.code !== undefined && (
        <p role="alert" className="text-sm text-red-700">
          {t('error.form.code')}
        </p>
      )}
      {verify.error !== null && (
        <p role="alert" className="text-sm text-red-700">
          {t(errorMessageKey(verify.error))}
        </p>
      )}

      <button
        type="submit"
        disabled={verify.isPending}
        className="w-full rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
      >
        {verify.isPending ? t('common.loading') : t('login.submit.verify')}
      </button>

      <button
        type="button"
        onClick={() => {
          setPhone(null);
        }}
        className="w-full text-sm text-slate-600 underline"
      >
        {t('login.changePhone')}
      </button>
    </form>
  );
}
