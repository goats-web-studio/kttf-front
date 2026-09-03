import { zodResolver } from '@hookform/resolvers/zod';
import {
  createPlayerSchema,
  genderSchema,
  gripSchema,
  playingHandSchema,
  type CreatePlayerInput,
} from '@kttf/shared/types';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { errorMessageKey } from '@/common/api';
import { useT, type MessageKey } from '@/common/i18n';
import { clubDirectoryQuery } from '@/features/clubs/queries';
import PhotoField from '@/features/players/photo-field';
import { playerName } from '@/features/players/player-name';
import { playersQuery } from '@/features/players/queries';

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
 * Профиль игрока — ТЗ 2.2 целиком.
 *
 * Одна форма и на заведение, и на правку: состав полей у них один, а
 * `updatePlayerSchema` — это `partial` от того же набора, полностью
 * заполненный он принимает. Вторая форма означала бы два места, где список
 * полей обязан совпадать, и первое же новое поле их разведёт.
 *
 * **Отчество не обязательно** — бриф, запрет №6. Пустая строка обращается в
 * «поле не задано», иначе схема отвергнет её как слишком короткую.
 *
 * Настроек аккаунта здесь нет: логин, почта, язык и пароль — другая
 * сущность и другой маршрут (ADR-035).
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
      blade: '',
      rubberForehand: '',
      rubberBackhand: '',
      bio: '',
      coachName: '',
      coachPlayerId: '',
      // Умолчание совпадает со схемой: до появления даты профиль показывал
      // только год, и галочка ничего не меняет в том, что о человеке видно.
      birthYearOnly: true,
      ...defaultValues,
    },
  });

  const { errors } = form.formState;

  /** Необязательное поле: пустое поле — это «не задано», а не пустая строка. */
  const optional = { setValueAs: (value: string) => (value === '' ? undefined : value) };

  // useWatch, а не form.watch: подписка на поле, а не перерисовка формы
  // целиком на каждое нажатие клавиши в любом из двадцати полей.
  const control = form.control;
  const photoUrl = useWatch({ control, name: 'photoUrl' });
  const birthDate = useWatch({ control, name: 'birthDate' });
  const birthYear = useWatch({ control, name: 'birthYear' });
  const coachPlayerId = useWatch({ control, name: 'coachPlayerId' });
  const coachName = useWatch({ control, name: 'coachName' });

  return (
    <form
      className="mt-6 space-y-6"
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

        {/* Поле одно — дата. Год из него выводится и в форме не показывается:
            спрашивать дважды об одном и том же, да ещё и отказывать за
            расхождение, — работа, переложенная на человека. Год при этом
            остаётся обязательным в контракте: по нему считаются возрастные
            категории и допуск на турнир. */}
        <Field
          label="player.form.birthDate"
          error={
            errors.birthDate === undefined && errors.birthYear === undefined
              ? undefined
              : 'error.form.birthDate'
          }
        >
          <input
            {...form.register('birthDate', {
              ...optional,
              onChange: (event: { target: { value: string } }) => {
                const year = Number(event.target.value.slice(0, 4));

                form.setValue(
                  'birthYear',
                  Number.isInteger(year) && year > 1900 ? year : (undefined as unknown as number),
                  { shouldValidate: true },
                );
              },
            })}
            type="date"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
          {/* Профили, заведённые до появления даты, знают только год. Пустое
              поле у такого профиля объясняется, а не выглядит как потеря. */}
          {birthDate === undefined && Number.isInteger(birthYear) && (
            <span className="mt-1 block text-xs text-slate-500">
              {t('player.form.birthYearOnlyKnown')} {birthYear}
            </span>
          )}
          <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" {...form.register('birthYearOnly')} />
            {t('player.form.birthYearOnly')}
          </label>
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

      <PhotoField
        value={photoUrl ?? null}
        onChange={(url) => {
          form.setValue('photoUrl', url ?? undefined, { shouldValidate: true });
        }}
      />

      <fieldset className="border-t border-slate-200 pt-4">
        <legend className="text-sm font-semibold text-slate-900">{t('player.form.game')}</legend>

        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="player.form.playingHand" optional error={undefined}>
            <select
              {...form.register('playingHand', optional)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            >
              <option value="">{t('player.form.notSet')}</option>
              {playingHandSchema.options.map((value) => (
                <option key={value} value={value}>
                  {t(HAND_KEYS[value])}
                </option>
              ))}
            </select>
          </Field>

          <Field label="player.form.grip" optional error={undefined}>
            <select
              {...form.register('grip', optional)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            >
              <option value="">{t('player.form.notSet')}</option>
              {gripSchema.options.map((value) => (
                <option key={value} value={value}>
                  {t(GRIP_KEYS[value])}
                </option>
              ))}
            </select>
          </Field>

          {/* Инвентарь — свободная строка, а не справочник моделей: свой
              справочник нужно наполнять и чистить, это отдельный продукт. */}
          <Field label="player.form.blade" optional error={undefined}>
            <input
              {...form.register('blade', optional)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </Field>

          <Field label="player.form.rubberForehand" optional error={undefined}>
            <input
              {...form.register('rubberForehand', optional)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </Field>

          <Field label="player.form.rubberBackhand" optional error={undefined}>
            <input
              {...form.register('rubberBackhand', optional)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </Field>
        </div>
      </fieldset>

      <CoachField
        form={form}
        optional={optional}
        chosenId={coachPlayerId}
        typedName={coachName}
        error={errors.coachName === undefined ? undefined : 'error.form.coach'}
      />

      <Field label="player.form.bio" optional error={undefined}>
        <textarea
          {...form.register('bio', optional)}
          rows={3}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
        />
      </Field>

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
 * Тренер: выбор из списка либо имя вручную.
 *
 * Разом заполненные, они спорят друг с другом — схема такое отвергает, —
 * поэтому выбор гасит поле и наоборот. Список делится надвое: сверху те,
 * кого уже называли тренером, ниже остальные игроки. Роли тренера в
 * продукте ещё нет, и «тренеры» — это те, на кого сослались.
 *
 * Список ограничен полусотней в каждой группе. Когда база вырастет, здесь
 * появится поиск: выпадающий список на всю страну не открывают.
 */
function CoachField({
  form,
  optional,
  chosenId,
  typedName,
  error,
}: {
  readonly form: ReturnType<typeof useForm<CreatePlayerInput>>;
  readonly optional: { setValueAs: (value: string) => string | undefined };
  readonly chosenId: string | undefined;
  readonly typedName: string | undefined;
  readonly error: MessageKey | undefined;
}): ReactNode {
  const t = useT();
  const coaches = useQuery(playersQuery({ page: 1, limit: 50, coachesOnly: true }));
  const players = useQuery(playersQuery({ page: 1, limit: 50 }));

  const coachItems = coaches.data?.items ?? [];
  const chosenIds = new Set(coachItems.map((coach) => coach.id));
  const others = (players.data?.items ?? []).filter((player) => !chosenIds.has(player.id));

  return (
    <fieldset className="border-t border-slate-200 pt-4">
      <legend className="text-sm font-semibold text-slate-900">{t('player.form.coach')}</legend>

      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <Field label="player.form.coachFromList" optional error={undefined}>
          <select
            {...form.register('coachPlayerId', {
              ...optional,
              onChange: () => {
                // Выбранный тренер и вписанный руками спорят друг с другом.
                form.setValue('coachName', undefined);
              },
            })}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            disabled={typedName !== undefined && typedName !== ''}
          >
            <option value="">{t('player.form.notSet')}</option>
            {coachItems.length > 0 && (
              <optgroup label={t('player.form.coachGroup')}>
                {coachItems.map((coach) => (
                  <option key={coach.id} value={coach.id}>
                    {playerName(coach)}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label={t('player.form.playersGroup')}>
              {others.map((player) => (
                <option key={player.id} value={player.id}>
                  {playerName(player)}
                </option>
              ))}
            </optgroup>
          </select>
        </Field>

        <Field label="player.form.coachName" optional error={error}>
          <input
            {...form.register('coachName', {
              ...optional,
              onChange: () => {
                form.setValue('coachPlayerId', undefined);
              },
            })}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            disabled={chosenId !== undefined && chosenId !== ''}
          />
        </Field>
      </div>
    </fieldset>
  );
}

/**
 * Пол — в текст интерфейса.
 *
 * Тип выведен из контракта: новое значение в общем коде ломает сборку здесь,
 * а не выходит к человеку английской строкой из базы.
 */
const GENDER_KEYS: Readonly<Record<NonNullable<CreatePlayerInput['gender']>, MessageKey>> = {
  MALE: 'player.gender.MALE',
  FEMALE: 'player.gender.FEMALE',
};

const HAND_KEYS: Readonly<Record<'RIGHT' | 'LEFT', MessageKey>> = {
  RIGHT: 'player.hand.RIGHT',
  LEFT: 'player.hand.LEFT',
};

const GRIP_KEYS: Readonly<Record<'SHAKEHAND' | 'PENHOLD', MessageKey>> = {
  SHAKEHAND: 'player.grip.SHAKEHAND',
  PENHOLD: 'player.grip.PENHOLD',
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
