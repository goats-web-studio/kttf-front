import { zodResolver } from '@hookform/resolvers/zod';
import {
  createTournamentSchema,
  genderSchema,
  tournamentLevelSchema,
  type CreateTournamentInput,
} from '@kttf/shared/types';
import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';

import { errorMessageKey } from '@/common/api';
import { useT, type MessageKey } from '@/common/i18n';
import { clubDirectoryQuery } from '@/features/clubs/queries';

import FormatEditor from './format-editor';
import { DEFAULT_DRAFT, toFormatConfig, type FormatDraft } from './format-draft';
import { TOURNAMENT_LEVEL_KEYS } from './labels';

interface TournamentFormProps {
  /** Клубы, которыми человек управляет. Пустой список сюда не доходит. */
  readonly clubIds: readonly string[];
  readonly isPending: boolean;
  readonly error: unknown;
  readonly onSubmit: (values: CreateTournamentInput) => void;
}

/**
 * Создание турнира — ТЗ 4.2.
 *
 * Требование ТЗ: типовой турнир заводится не дольше тридцати секунд. Отсюда
 * устройство формы — обязательное сверху и заполнено умолчаниями, всё
 * необязательное ниже и пустое. Организатор, которому нужен обычный клубный
 * турнир, вводит название и дату.
 *
 * Схема проведения правится редактором (ADR-024) и уходит на сервер полем
 * `formatConfig` — тем же, что читают жеребьёвка и офлайн-консоль.
 *
 * Права проверяет сервер (ТС 8.3): создание в чужом клубе он отвергнет,
 * а не отсутствие клуба в этом списке.
 */
export default function TournamentForm({
  clubIds,
  isPending,
  error,
  onSubmit,
}: TournamentFormProps): ReactNode {
  const t = useT();
  const clubs = useQuery(clubDirectoryQuery);

  // Черновик схемы живёт отдельно: у формы плоские поля, а `formatConfig` —
  // объединение четырёх форм, и переключение схемы не должно терять
  // введённое в соседней.
  const [draft, setDraft] = useState<FormatDraft>(DEFAULT_DRAFT);
  const [participants, setParticipants] = useState(16);

  const form = useForm({
    resolver: zodResolver(createTournamentSchema),
    defaultValues: {
      clubId: clubIds[0] ?? '',
      name: '',
      entryFee: 0,
      level: 'CLUB' as const,
      tableCount: 4,
      formatConfig: toFormatConfig(DEFAULT_DRAFT),
      seedingConfig: { method: 'RATING' as const, separateByClub: true },
    },
  });

  const { errors } = form.formState;

  /** Пустое необязательное поле — это «не задано», а не пустая строка. */
  const optionalText = { setValueAs: (value: string) => (value === '' ? undefined : value) };
  const optionalNumber = {
    setValueAs: (value: string) => (value === '' ? undefined : Number(value)),
  };
  /**
   * Поле даты отдаёт местное время без зоны, контракт принимает момент.
   * Без преобразования турнир, начинающийся в полдень в Алматы, уехал бы
   * на шесть часов.
   */
  const moment = {
    setValueAs: (value: string) => (value === '' ? undefined : new Date(value).toISOString()),
  };

  return (
    <form
      className="mt-6"
      onSubmit={(event) => {
        void form.handleSubmit(onSubmit)(event);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="tournament.form.name"
          error={errors.name === undefined ? undefined : 'error.form.name'}
        >
          <input
            {...form.register('name')}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </Field>

        <Field
          label="tournament.form.club"
          error={errors.clubId === undefined ? undefined : 'error.form.club'}
        >
          <select
            {...form.register('clubId')}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            {clubIds.map((clubId) => (
              <option key={clubId} value={clubId}>
                {clubs.data?.get(clubId)?.name ?? clubId}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="tournament.form.startsAt"
          error={errors.startsAt === undefined ? undefined : 'error.form.startsAt'}
        >
          <input
            {...form.register('startsAt', moment)}
            type="datetime-local"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </Field>

        <Field label="tournament.form.registrationEndsAt" optional error={undefined}>
          {/* По умолчанию — время начала турнира (ТЗ 4.2). Умолчание ставит
              сервер, а не форма: иначе оно жило бы в двух местах. */}
          <input
            {...form.register('registrationEndsAt', moment)}
            type="datetime-local"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </Field>

        <Field
          label="tournament.form.entryFee"
          error={errors.entryFee === undefined ? undefined : 'error.form.entryFee'}
        >
          <input
            {...form.register('entryFee', { valueAsNumber: true })}
            type="number"
            inputMode="numeric"
            min={0}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </Field>

        <Field
          label="tournament.form.level"
          error={errors.level === undefined ? undefined : 'error.form.level'}
        >
          {/* Коэффициент турнира в формуле рейтинга — ТЗ 7.1. */}
          <select
            {...form.register('level')}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            {tournamentLevelSchema.options.map((level) => (
              <option key={level} value={level}>
                {t(TOURNAMENT_LEVEL_KEYS[level])}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="tournament.form.tableCount"
          error={errors.tableCount === undefined ? undefined : 'error.form.tableCount'}
        >
          <input
            {...form.register('tableCount', { valueAsNumber: true })}
            type="number"
            inputMode="numeric"
            min={1}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </Field>
      </div>

      <FormatEditor
        draft={draft}
        onChange={(next) => {
          setDraft(next);
          // Схема уходит на сервер тем же значением, по которому считался
          // предпросчёт: иначе показанное и созданное могли бы разойтись.
          form.setValue('formatConfig', toFormatConfig(next));
        }}
        participants={participants}
        onParticipantsChange={setParticipants}
      />

      <fieldset className="mt-8 rounded border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">
          {t('tournament.form.seeding')}
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="tournament.form.seedingMethod" error={undefined}>
            <select
              {...form.register('seedingConfig.method')}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            >
              <option value="RATING">{t('tournament.seeding.RATING')}</option>
              <option value="RANDOM">{t('tournament.seeding.RANDOM')}</option>
              <option value="MANUAL">{t('tournament.seeding.MANUAL')}</option>
            </select>
          </Field>

          <label className="flex items-center gap-2 self-end text-sm text-slate-700">
            {/* Разведение не гарантируется: посев старше, несведённые пары
                возвращаются списком после жеребьёвки (ADR-011). */}
            <input type="checkbox" {...form.register('seedingConfig.separateByClub')} />
            {t('tournament.form.separateByClub')}
          </label>
        </div>
      </fieldset>

      <fieldset className="mt-8 rounded border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">
          {t('tournament.form.limits')}
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="tournament.form.maxParticipants" optional error={undefined}>
            <input
              {...form.register('maxParticipants', optionalNumber)}
              type="number"
              inputMode="numeric"
              min={1}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </Field>

          <Field label="tournament.form.genderLimit" optional error={undefined}>
            <select
              {...form.register('genderLimit', optionalText)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            >
              <option value="">{t('filter.any')}</option>
              {genderSchema.options.map((gender) => (
                <option key={gender} value={gender}>
                  {t(gender === 'FEMALE' ? 'player.gender.FEMALE' : 'player.gender.MALE')}
                </option>
              ))}
            </select>
          </Field>

          <Field label="tournament.form.ratingCapMin" optional error={undefined}>
            <input
              {...form.register('ratingCapMin', optionalNumber)}
              type="number"
              inputMode="numeric"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </Field>

          <Field label="tournament.form.ratingCapMax" optional error={undefined}>
            <input
              {...form.register('ratingCapMax', optionalNumber)}
              type="number"
              inputMode="numeric"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </Field>

          <Field label="tournament.form.birthYearFrom" optional error={undefined}>
            <input
              {...form.register('birthYearFrom', optionalNumber)}
              type="number"
              inputMode="numeric"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </Field>

          <Field label="tournament.form.birthYearTo" optional error={undefined}>
            <input
              {...form.register('birthYearTo', optionalNumber)}
              type="number"
              inputMode="numeric"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </Field>
        </div>

        <div className="mt-4 grid gap-4">
          <Field label="tournament.form.description" optional error={undefined}>
            <textarea
              {...form.register('description', optionalText)}
              rows={3}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </Field>

          <Field label="tournament.form.prizeInfo" optional error={undefined}>
            <textarea
              {...form.register('prizeInfo', optionalText)}
              rows={2}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </Field>
        </div>
      </fieldset>

      {/* Границы, вывернутые наизнанку, отвергает схема целиком, а не поле:
          ошибка принадлежит паре, и показывать её у одного из двух значило бы
          винить не то поле. */}
      {errors.root !== undefined && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {t('error.form.bounds')}
        </p>
      )}

      {error !== null && error !== undefined && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {t(errorMessageKey(error))}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mt-6 rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
      >
        {isPending ? t('common.loading') : t('tournament.form.create')}
      </button>
    </form>
  );
}

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
