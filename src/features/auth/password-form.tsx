import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema, type ChangePasswordInput } from '@kttf/shared/types';
import { useMutation } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';

import { errorMessageKey } from '@/common/api';
import { useT, type MessageKey } from '@/common/i18n';
import { changePassword } from '@/features/auth/api';
import { useSessionStore } from '@/features/auth/session-store';

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

  return (
    <form
      className="mt-4 space-y-4"
      onSubmit={(event) => {
        void form.handleSubmit((values) => {
          change.mutate(values);
        })(event);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="account.password.current" error={undefined}>
          <input
            {...form.register('currentPassword')}
            type="password"
            autoComplete="current-password"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </Field>

        <Field
          label="account.password.next"
          error={errors.newPassword === undefined ? undefined : 'error.form.password'}
        >
          <input
            {...form.register('newPassword')}
            type="password"
            autoComplete="new-password"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </Field>
      </div>

      {change.error !== null && (
        <p role="alert" className="text-sm text-red-700">
          {t(errorMessageKey(change.error))}
        </p>
      )}

      {change.isSuccess && (
        <p className="text-sm text-green-700">{t('account.password.changed')}</p>
      )}

      <button
        type="submit"
        disabled={change.isPending}
        className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
      >
        {change.isPending ? t('common.loading') : t('account.password.submit')}
      </button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  readonly label: MessageKey;
  readonly error: MessageKey | undefined;
  readonly children: ReactNode;
}): ReactNode {
  const t = useT();

  return (
    <label className="block text-sm">
      <span className="text-slate-700">{t(label)}</span>
      {children}
      {error !== undefined && (
        <span role="alert" className="mt-1 block text-red-700">
          {t(error)}
        </span>
      )}
    </label>
  );
}
