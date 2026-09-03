import { zodResolver } from '@hookform/resolvers/zod';
import { signUpSchema, type PlayerView } from '@kttf/shared/types';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';
import { playerName } from '@/features/players/player-name';
import { playersQuery } from '@/features/players/queries';

import { signUp } from './api';
import { useSessionStore } from './session-store';
import Button from '@/common/ui/button';

interface SignUpFormProps {
  readonly onSignedUp: () => void;
}

/**
 * Регистрация — ТЗ 2.1, ADR-034.
 *
 * Игроков заводит тренер, поэтому человек, придя сам, ищет себя среди тех,
 * у кого ещё нет кабинета, и привязывается к собственной истории встреч и
 * рейтингу. Без этого шага он завёл бы себе второй профиль, и рейтинг
 * разошёлся бы на два — ровно та беда, ради устранения которой делается
 * продукт.
 *
 * Поиск, а не список целиком: игроков в стране больше, чем помещается в
 * выпадающий список, и выбирать себя из чужих фамилий человеку незачем.
 */
export default function SignUpForm({ onSignedUp }: SignUpFormProps): ReactNode {
  const t = useT();
  const signedIn = useSessionStore((state) => state.signedIn);

  const [search, setSearch] = useState('');
  const [chosen, setChosen] = useState<PlayerView | null>(null);

  const form = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: { login: '', password: '', phone: '' },
  });

  // Запрос идёт только после того, как человек начал искать: пустой поиск
  // вернул бы всех игроков страны.
  const found = useQuery({
    ...playersQuery({ search, withoutAccount: true, page: 1, limit: 10 }),
    enabled: search.trim().length >= 2,
  });

  const register = useMutation({
    mutationFn: signUp,
    onSuccess: (session) => {
      signedIn(session);
      onSignedUp();
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        void form.handleSubmit((values) => {
          register.mutate({
            ...values,
            ...(chosen === null ? {} : { playerId: chosen.id }),
          });
        })(event);
      }}
    >
      <p className="text-ink-700">{t('signUp.lead')}</p>

      <label className="block">
        <span className="text-sm text-ink-700">{t('signUp.login.label')}</span>
        <input
          {...form.register('login')}
          autoComplete="username"
          className="mt-1 w-full rounded border border-line-strong px-3 py-2"
        />
      </label>
      {form.formState.errors.login !== undefined && (
        <p role="alert" className="text-sm text-red-700">
          {t('error.form.login')}
        </p>
      )}

      <label className="block">
        <span className="text-sm text-ink-700">{t('signUp.password.label')}</span>
        <input
          {...form.register('password')}
          type="password"
          autoComplete="new-password"
          className="mt-1 w-full rounded border border-line-strong px-3 py-2"
        />
      </label>
      {form.formState.errors.password !== undefined && (
        <p role="alert" className="text-sm text-red-700">
          {t('error.form.password')}
        </p>
      )}

      <label className="block">
        <span className="text-sm text-ink-700">{t('signUp.phone.label')}</span>
        <input
          {...form.register('phone')}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder={t('login.phone.placeholder')}
          className="mt-1 w-full rounded border border-line-strong px-3 py-2"
        />
      </label>
      {form.formState.errors.phone !== undefined && (
        <p role="alert" className="text-sm text-red-700">
          {t('error.form.phone')}
        </p>
      )}

      <fieldset className="rounded border border-line p-3">
        <legend className="px-1 text-sm text-ink-700">{t('signUp.player.title')}</legend>
        <p className="text-sm text-ink-700">{t('signUp.player.lead')}</p>

        {chosen === null ? (
          <>
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
              }}
              placeholder={t('signUp.player.search')}
              className="mt-2 w-full rounded border border-line-strong px-3 py-2"
            />

            {found.data !== undefined && (
              <ul aria-label={t('signUp.player.title')} className="mt-2 space-y-1 text-sm">
                {found.data.items.length === 0 ? (
                  <li className="text-ink-500">{t('signUp.player.empty')}</li>
                ) : (
                  found.data.items.map((player) => (
                    <li key={player.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setChosen(player);
                        }}
                        className="rounded px-2 py-1 text-red-600 underline"
                      >
                        {playerName(player)} · {player.city} · {player.rating}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm">
            <span className="font-medium text-ink-900">{playerName(chosen)}</span>{' '}
            <button
              type="button"
              onClick={() => {
                setChosen(null);
              }}
              className="text-red-600 underline"
            >
              {t('signUp.player.reset')}
            </button>
          </p>
        )}
      </fieldset>

      {register.error !== null && (
        <p role="alert" className="text-sm text-red-700">
          {t(errorMessageKey(register.error))}
        </p>
      )}

      <Button variant="primary" type="submit" disabled={register.isPending} className="w-full">
        {register.isPending ? t('common.loading') : t('signUp.submit')}
      </Button>
    </form>
  );
}
