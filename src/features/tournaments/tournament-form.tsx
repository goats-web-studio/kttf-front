import { zodResolver } from '@hookform/resolvers/zod';
import {
  createTournamentSchema,
  genderSchema,
  tournamentLevelSchema,
  type CreateTournamentInput,
  type TournamentView,
} from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useQuery } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';
import { useState, type ReactNode, type Ref } from 'react';
import { Controller, useForm, type DefaultValues } from 'react-hook-form';
import type { z } from 'zod';

import { errorMessageKey } from '@/common/api';
import { useT, type MessageKey } from '@/common/i18n';
import { clubDirectoryQuery } from '@/features/clubs/queries';

import FormatEditor, { Section } from './format-editor';
import { DEFAULT_DRAFT, fromFormatConfig, toFormatConfig, type FormatDraft } from './format-draft';
import { TOURNAMENT_LEVEL_KEYS } from './labels';

interface TournamentFormProps {
  /** Клубы, которыми человек управляет. Пустой список сюда не доходит. */
  readonly clubIds: readonly string[];
  /** Турнир для правки. Без него форма заводит новый. */
  readonly tournament?: TournamentView;
  readonly isPending: boolean;
  readonly error: unknown;
  readonly onSubmit: (values: CreateTournamentInput) => void;
}

/** Две колонки от 640px, одна на телефоне: поле во всю ширину пальца. */
const GRID = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
} as const;

/** Значения формы до разбора схемой — то, что лежит в полях. */
type FormValues = z.input<typeof createTournamentSchema>;

/** Числовое поле: цифровая клавиатура на телефоне. */
const NUMERIC = { inputMode: 'numeric' } as const;

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
  tournament,
  isPending,
  error,
  onSubmit,
}: TournamentFormProps): ReactNode {
  const t = useT();
  const clubs = useQuery(clubDirectoryQuery);

  // Черновик схемы живёт отдельно: у формы плоские поля, а `formatConfig` —
  // объединение четырёх форм, и переключение схемы не должно терять
  // введённое в соседней.
  const [draft, setDraft] = useState<FormatDraft>(() =>
    tournament === undefined ? DEFAULT_DRAFT : fromFormatConfig(tournament.formatConfig),
  );
  // Для записанного турнира предпросчёт сразу считается по его составу.
  const [participants, setParticipants] = useState(
    tournament !== undefined && tournament.participantCount > 1 ? tournament.participantCount : 16,
  );

  const form = useForm<FormValues, unknown, CreateTournamentInput>({
    resolver: zodResolver(createTournamentSchema),
    defaultValues:
      tournament === undefined ? NEW_TOURNAMENT(clubIds[0] ?? '') : toValues(tournament),
  });

  const { errors } = form.formState;

  /**
   * Регистрация родного поля внутри `TextField`: ссылка обязана указывать на
   * сам `<input>`, а не на обёртку, — иначе форма не прочтёт значение и не
   * поставит фокус на ошибку.
   */
  const register = (...args: Parameters<typeof form.register>) => {
    const { ref, ...rest } = form.register(...args);
    return { ...rest, inputRef: ref };
  };

  /** Пустое необязательное поле — это «не задано», а не пустая строка. */
  const optionalText = { setValueAs: (value: string) => (value === '' ? undefined : value) };
  const optionalNumber = {
    setValueAs: (value: string) => (value === '' ? undefined : Number(value)),
  };

  return (
    <Box
      component="form"
      noValidate
      sx={{ mt: 3 }}
      onSubmit={(event) => {
        void form.handleSubmit(onSubmit)(event);
      }}
    >
      <Box sx={GRID}>
        <TextField
          label={t('tournament.form.name')}
          {...register('name')}
          {...hint(t, errors.name === undefined ? undefined : 'error.form.name')}
        />

        <Controller
          control={form.control}
          name="clubId"
          render={({ field: { ref, ...field } }) => (
            <TextField
              select
              label={t('tournament.form.club')}
              {...field}
              inputRef={ref}
              // Турнир остаётся в клубе, где создан (ТС 7.5).
              disabled={tournament !== undefined}
              {...hint(t, errors.clubId === undefined ? undefined : 'error.form.club')}
            >
              {clubIds.map((clubId) => (
                <MenuItem key={clubId} value={clubId}>
                  {clubs.data?.get(clubId)?.name ?? clubId}
                </MenuItem>
              ))}
            </TextField>
          )}
        />

        <Controller
          control={form.control}
          name="startsAt"
          render={({ field }) => (
            <MomentPicker
              label={t('tournament.form.startsAt')}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
              {...(errors.startsAt === undefined ? {} : { error: t('error.form.startsAt') })}
            />
          )}
        />

        {/* По умолчанию — время начала турнира (ТЗ 4.2). Умолчание ставит
            сервер, а не форма: иначе оно жило бы в двух местах. */}
        <Controller
          control={form.control}
          name="registrationEndsAt"
          render={({ field }) => (
            <MomentPicker
              label={t('tournament.form.registrationEndsAt')}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
              hint={t('player.form.optional')}
            />
          )}
        />

        <TextField
          label={t('tournament.form.entryFee')}
          type="number"
          // Стёртый взнос — бесплатный турнир, а не ошибка формы.
          {...register('entryFee', {
            setValueAs: (value: string) => (value === '' ? 0 : Number(value)),
          })}
          {...hint(t, errors.entryFee === undefined ? undefined : 'error.form.entryFee', false, {
            ...NUMERIC,
            min: 0,
          })}
        />

        {/* Коэффициент турнира в формуле рейтинга — ТЗ 7.1. */}
        <Controller
          control={form.control}
          name="level"
          render={({ field: { ref, ...field } }) => (
            <TextField
              select
              label={t('tournament.form.level')}
              {...field}
              inputRef={ref}
              {...hint(t, errors.level === undefined ? undefined : 'error.form.level')}
            >
              {tournamentLevelSchema.options.map((level) => (
                <MenuItem key={level} value={level}>
                  {t(TOURNAMENT_LEVEL_KEYS[level])}
                </MenuItem>
              ))}
            </TextField>
          )}
        />

        <TextField
          label={t('tournament.form.tableCount')}
          type="number"
          {...register('tableCount', { valueAsNumber: true })}
          {...hint(
            t,
            errors.tableCount === undefined ? undefined : 'error.form.tableCount',
            false,
            { ...NUMERIC, min: 1 },
          )}
        />
      </Box>

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

      <Section legend={t('tournament.form.seeding')}>
        <Box sx={{ ...GRID, alignItems: 'center' }}>
          <Controller
            control={form.control}
            name="seedingConfig.method"
            render={({ field: { ref, ...field } }) => (
              <TextField
                select
                label={t('tournament.form.seedingMethod')}
                {...field}
                inputRef={ref}
              >
                <MenuItem value="RATING">{t('tournament.seeding.RATING')}</MenuItem>
                <MenuItem value="RANDOM">{t('tournament.seeding.RANDOM')}</MenuItem>
                <MenuItem value="MANUAL">{t('tournament.seeding.MANUAL')}</MenuItem>
              </TextField>
            )}
          />

          {/* Разведение не гарантируется: посев старше, несведённые пары
              возвращаются списком после жеребьёвки (ADR-011). */}
          <Controller
            control={form.control}
            name="seedingConfig.separateByClub"
            render={({ field }) => (
              <FormControlLabel
                sx={{ minHeight: 44 }}
                label={t('tournament.form.separateByClub')}
                control={
                  <Checkbox
                    name={field.name}
                    checked={field.value === true}
                    onChange={(event) => {
                      field.onChange(event.target.checked);
                    }}
                    onBlur={field.onBlur}
                    slotProps={{ input: { ref: field.ref } }}
                  />
                }
              />
            )}
          />
        </Box>
      </Section>

      <Section legend={t('tournament.form.limits')}>
        <Box sx={GRID}>
          <TextField
            label={t('tournament.form.maxParticipants')}
            type="number"
            {...register('maxParticipants', optionalNumber)}
            {...hint(t, undefined, true, { ...NUMERIC, min: 1 })}
          />

          <Controller
            control={form.control}
            name="genderLimit"
            render={({ field: { ref, value, onChange, ...field } }) => (
              <TextField
                select
                label={t('tournament.form.genderLimit')}
                {...field}
                value={value ?? ''}
                onChange={(event) => {
                  onChange(event.target.value === '' ? undefined : event.target.value);
                }}
                inputRef={ref}
                {...hint(t, undefined, true)}
              >
                <MenuItem value="">{t('filter.any')}</MenuItem>
                {genderSchema.options.map((gender) => (
                  <MenuItem key={gender} value={gender}>
                    {t(gender === 'FEMALE' ? 'player.gender.FEMALE' : 'player.gender.MALE')}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          <TextField
            label={t('tournament.form.ratingCapMin')}
            type="number"
            {...register('ratingCapMin', optionalNumber)}
            {...hint(t, undefined, true, NUMERIC)}
          />

          <TextField
            label={t('tournament.form.ratingCapMax')}
            type="number"
            {...register('ratingCapMax', optionalNumber)}
            {...hint(t, undefined, true, NUMERIC)}
          />

          {/* Заявки вне планки — ADR-044. Возраст и пол галочка не трогает:
              это условия турнира, а не уровня игры. */}
          <Controller
            control={form.control}
            name="reviewOutOfRating"
            render={({ field }) => (
              <FormControlLabel
                sx={{ minHeight: 44, gridColumn: { sm: 'span 2' } }}
                label={t('tournament.form.reviewOutOfRating')}
                control={
                  <Checkbox
                    name={field.name}
                    checked={field.value === true}
                    onChange={(event) => {
                      field.onChange(event.target.checked);
                    }}
                    onBlur={field.onBlur}
                    slotProps={{ input: { ref: field.ref } }}
                  />
                }
              />
            )}
          />

          <TextField
            label={t('tournament.form.birthYearFrom')}
            type="number"
            {...register('birthYearFrom', optionalNumber)}
            {...hint(t, undefined, true, NUMERIC)}
          />

          <TextField
            label={t('tournament.form.birthYearTo')}
            type="number"
            {...register('birthYearTo', optionalNumber)}
            {...hint(t, undefined, true, NUMERIC)}
          />
        </Box>

        <Box sx={{ mt: 2, display: 'grid', gap: 2 }}>
          <TextField
            label={t('tournament.form.description')}
            multiline
            minRows={3}
            {...register('description', optionalText)}
            {...hint(t, undefined, true)}
          />

          <TextField
            label={t('tournament.form.prizeInfo')}
            multiline
            minRows={2}
            {...register('prizeInfo', optionalText)}
            {...hint(t, undefined, true)}
          />
        </Box>
      </Section>

      {/* Границы, вывернутые наизнанку, отвергает схема целиком, а не поле:
          ошибка принадлежит паре, и показывать её у одного из двух значило бы
          винить не то поле. */}
      {errors.root !== undefined && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t('error.form.bounds')}
        </Alert>
      )}

      {error !== null && error !== undefined && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t(errorMessageKey(error))}
        </Alert>
      )}

      <Button
        variant="contained"
        size="large"
        type="submit"
        disabled={isPending}
        sx={{ mt: 3, width: { xs: '100%', sm: 'auto' } }}
      >
        {isPending
          ? t('common.loading')
          : t(tournament === undefined ? 'tournament.form.create' : 'tournament.form.save')}
      </Button>
    </Box>
  );
}

/**
 * Подсказка под полем: ошибка — объявляется чтецу экрана сразу, пометка
 * «необязательно» — просто текстом. Подпись поля при этом остаётся ровно
 * названием поля: по нему поле и находят.
 */
function hint(
  t: (key: MessageKey) => string,
  error: MessageKey | undefined,
  optional = false,
  htmlInput?: Readonly<Record<string, unknown>>,
) {
  const input = htmlInput === undefined ? {} : { htmlInput };

  if (error !== undefined) {
    return {
      error: true,
      helperText: t(error),
      slotProps: { ...input, formHelperText: { role: 'alert' } },
    };
  }

  return {
    ...(optional ? { helperText: t('player.form.optional') } : {}),
    slotProps: input,
  };
}

/**
 * Момент времени — дата и время начала.
 *
 * Выбранное хранится здесь, а в форму уходит ISO: контракт принимает момент,
 * а поле показывает местное время. Без преобразования турнир, начинающийся в
 * полдень в Алматы, уехал бы на шесть часов. Недописанная дата — «не задано»,
 * а не ошибка разбора: ошибку назовёт проверка формы.
 *
 * Своё состояние, а не вычисление из значения формы: недописанная дата в
 * форме — пустота, и поле, получив её обратно, стёрло бы набранное.
 */
function MomentPicker({
  label,
  name,
  value,
  onChange,
  onBlur,
  inputRef,
  error,
  hint,
}: {
  readonly label: string;
  readonly name: string;
  readonly value: string | undefined;
  readonly onChange: (value: string | undefined) => void;
  readonly onBlur: () => void;
  readonly inputRef: Ref<HTMLInputElement>;
  /** Текст ошибки: объявляется чтецу экрана сразу. */
  readonly error?: string;
  /** Пометка под полем, когда ошибки нет. */
  readonly hint?: string;
}): ReactNode {
  const [picked, setPicked] = useState<Dayjs | null>(() =>
    value === undefined ? null : dayjs(value),
  );

  return (
    <DateTimePicker
      label={label}
      name={name}
      value={picked}
      inputRef={inputRef}
      onChange={(next) => {
        setPicked(next);
        onChange(next?.isValid() === true ? next.toISOString() : undefined);
      }}
      slotProps={{
        textField:
          error === undefined
            ? { onBlur, ...(hint === undefined ? {} : { helperText: hint }) }
            : {
                onBlur,
                error: true,
                helperText: error,
                slotProps: { formHelperText: { role: 'alert' } },
              },
        field: { clearable: true },
      }}
    />
  );
}

/** Умолчания нового турнира — обычный клубный, его заводят за полминуты. */
function NEW_TOURNAMENT(clubId: string): DefaultValues<FormValues> {
  return {
    clubId,
    name: '',
    entryFee: 0,
    level: 'CLUB',
    tableCount: 4,
    formatConfig: toFormatConfig(DEFAULT_DRAFT),
    seedingConfig: { method: 'RATING', separateByClub: true },
    reviewOutOfRating: false,
  };
}

/**
 * Сохранённый турнир — в значения формы. Пустое в ответе (`null`) —
 * незаполненное поле формы, а не пустая строка.
 */
function toValues(tournament: TournamentView): DefaultValues<FormValues> {
  const optional = <K extends keyof CreateTournamentInput>(
    key: K,
    value: CreateTournamentInput[K] | null,
  ): DefaultValues<FormValues> => (value === null ? {} : { [key]: value });

  return {
    clubId: tournament.clubId,
    name: tournament.name,
    startsAt: tournament.startsAt,
    entryFee: tournament.entryFee,
    level: tournament.level,
    tableCount: tournament.tableCount,
    formatConfig: tournament.formatConfig,
    seedingConfig: tournament.seedingConfig ?? { method: 'RATING', separateByClub: true },
    reviewOutOfRating: tournament.reviewOutOfRating,
    ...optional('registrationEndsAt', tournament.registrationEndsAt),
    ...optional('maxParticipants', tournament.maxParticipants),
    ...optional(
      'ratingCapMin',
      tournament.ratingCapMin === null ? null : Number(tournament.ratingCapMin),
    ),
    ...optional(
      'ratingCapMax',
      tournament.ratingCapMax === null ? null : Number(tournament.ratingCapMax),
    ),
    ...optional('birthYearFrom', tournament.birthYearFrom),
    ...optional('birthYearTo', tournament.birthYearTo),
    ...optional('genderLimit', tournament.genderLimit),
    ...optional('description', tournament.description),
    ...optional('prizeInfo', tournament.prizeInfo),
  };
}
