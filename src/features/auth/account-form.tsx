import { zodResolver } from '@hookform/resolvers/zod';
import {
  localeSchema,
  updateAccountSchema,
  type AuthUserView,
  type UpdateAccountInput,
} from '@kttf/shared/types';
import { useMutation } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';

import { errorMessageKey } from '@/common/api';
import { useT, type MessageKey } from '@/common/i18n';
import { updateAccount } from '@/features/auth/api';
import { useSessionStore } from '@/features/auth/session-store';

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

  return (
    <form
      className="mt-4 space-y-4"
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="account.form.login"
          error={errors.login === undefined ? undefined : 'error.form.login'}
        >
          <input
            {...form.register('login', optional)}
            autoComplete="username"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </Field>

        <Field
          label="account.form.email"
          optional
          error={errors.email === undefined ? undefined : 'error.form.email'}
        >
          <input
            {...form.register('email', optional)}
            type="email"
            autoComplete="email"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </Field>

        <Field label="account.form.locale" error={undefined}>
          <select
            {...form.register('locale')}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            {localeSchema.options.map((value) => (
              <option key={value} value={value}>
                {t(LOCALE_KEYS[value])}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="account.form.telegram"
          optional
          error={errors.telegramId === undefined ? undefined : 'error.form.telegram'}
        >
          <input
            {...form.register('telegramId', optional)}
            inputMode="numeric"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
          <span className="mt-1 block text-xs text-slate-500">
            {t('account.form.telegramHint')}
          </span>
        </Field>
      </div>

      {save.error !== null && (
        <p role="alert" className="text-sm text-red-700">
          {t(errorMessageKey(save.error))}
        </p>
      )}

      {save.isSuccess && !form.formState.isDirty && (
        <p className="text-sm text-green-700">{t('account.form.saved')}</p>
      )}

      <button
        type="submit"
        disabled={save.isPending}
        className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
      >
        {save.isPending ? t('common.loading') : t('account.form.save')}
      </button>
    </form>
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

function Field({
  label,
  optional = false,
  error,
  children,
}: {
  readonly label: MessageKey;
  readonly optional?: boolean;
  readonly error: MessageKey | undefined;
  readonly children: ReactNode;
}): ReactNode {
  const t = useT();

  return (
    <label className="block text-sm">
      <span className="text-slate-700">{t(label)}</span>
      {optional && <span className="ml-1 text-xs text-slate-400">{t('player.form.optional')}</span>}
      {children}
      {error !== undefined && (
        <span role="alert" className="mt-1 block text-red-700">
          {t(error)}
        </span>
      )}
    </label>
  );
}
