import { zodResolver } from '@hookform/resolvers/zod';
import { createPlayerSchema, genderSchema, type CreatePlayerInput } from '@kttf/shared/types';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';

import { errorMessageKey } from '@/common/api';
import { useT, type MessageKey } from '@/common/i18n';
import { clubDirectoryQuery } from '@/features/clubs/queries';

interface PlayerFormProps {
  /** Заполненные поля при правке. Пусто — профиль заводится впервые. */
  readonly defaultValues?: Partial<CreatePlayerInput> | undefined;
  readonly submitLabel: MessageKey;
  readonly isPending: boolean;
  readonly error: unknown;
  readonly onSubmit: (values: CreatePlayerInput) => void;
  readonly onCancel?: (() => void) | undefined;
}

/**
 * Профиль игрока — ТЗ 2.2.
 *
 * Одна форма и на заведение, и на правку: состав полей у них один, а
 * `updatePlayerSchema` — это `partial` от того же набора, полностью
 * заполненный он принимает. Вторая форма означала бы два места, где список
 * полей обязан совпадать, и первое же новое поле их разведёт.
 *
 * **Отчество не обязательно** — бриф, запрет №6. Пустая строка обращается в
 * «поле не задано», иначе схема отвергнет её как слишком короткую.
 *
 * Фото, игровой руки, хвата и инвентаря из ТЗ 2.2 здесь нет: первого нет
 * маршрута загрузки, остальных — колонок в схеме (ОВ-12).
 */
export default function PlayerForm({
  defaultValues,
  submitLabel,
  isPending,
  error,
  onSubmit,
  onCancel,
}: PlayerFormProps): ReactNode {
  const t = useT();
  const clubs = useQuery(clubDirectoryQuery);

  const form = useForm({
    resolver: zodResolver(createPlayerSchema),
    defaultValues: {
      lastName: '',
      firstName: '',
      middleName: '',
      city: '',
      clubId: '',
      ...defaultValues,
    },
  });

  const { errors } = form.formState;

  /** Необязательное поле: пустое поле — это «не задано», а не пустая строка. */
  const optional = { setValueAs: (value: string) => (value === '' ? undefined : value) };

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(event) => {
        void form.handleSubmit(onSubmit)(event);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="player.form.lastName"
          error={errors.lastName === undefined ? undefined : 'error.form.name'}
        >
          <input
            {...form.register('lastName')}
            autoComplete="family-name"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </Field>

        <Field
          label="player.form.firstName"
          error={errors.firstName === undefined ? undefined : 'error.form.name'}
        >
          <input
            {...form.register('firstName')}
            autoComplete="given-name"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </Field>

        <Field label="player.form.middleName" optional error={undefined}>
          <input
            {...form.register('middleName', optional)}
            autoComplete="additional-name"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </Field>

        <Field
          label="player.form.birthYear"
          error={errors.birthYear === undefined ? undefined : 'error.form.birthYear'}
        >
          <input
            {...form.register('birthYear', { valueAsNumber: true })}
            type="number"
            inputMode="numeric"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </Field>

        <Field
          label="player.form.gender"
          error={errors.gender === undefined ? undefined : 'error.form.gender'}
        >
          <select
            {...form.register('gender')}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="">{t('player.form.choose')}</option>
            {genderSchema.options.map((value) => (
              <option key={value} value={value}>
                {t(GENDER_KEYS[value])}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="player.form.city"
          error={errors.city === undefined ? undefined : 'error.form.city'}
        >
          <input
            {...form.register('city')}
            autoComplete="address-level2"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </Field>

        <Field label="player.form.club" optional error={undefined}>
          {/* Клуб при саморегистрации сервер не проверяет: игрок объявляет
              принадлежность сам, и прав она не даёт — права живут в составе
              клуба, а не в поле профиля (ADR-014). */}
          <select
            {...form.register('clubId', optional)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="">{t('player.form.noClub')}</option>
            {[...(clubs.data?.values() ?? [])].map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {error !== null && error !== undefined && (
        <p role="alert" className="text-sm text-red-700">
          {t(errorMessageKey(error))}
        </p>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
        >
          {isPending ? t('common.loading') : t(submitLabel)}
        </button>
        {onCancel !== undefined && (
          <button type="button" onClick={onCancel} className="text-sm text-slate-600 underline">
            {t('player.form.cancel')}
          </button>
        )}
      </div>
    </form>
  );
}

/**
 * Пол — в текст интерфейса.
 *
 * Тип выведен из контракта: новое значение в общем коде ломает сборку здесь,
 * а не выходит к человеку английской строкой из базы.
 */
const GENDER_KEYS: Readonly<Record<CreatePlayerInput['gender'], MessageKey>> = {
  MALE: 'player.gender.MALE',
  FEMALE: 'player.gender.FEMALE',
};

/**
 * Подпись, поле и текст отказа.
 *
 * Сообщение берётся из словаря, а не из схемы: тексты внутри схем общие с
 * сервером и не локализуются — бриф 3.4.
 */
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
