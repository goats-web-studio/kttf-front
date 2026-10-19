import { zodResolver } from '@hookform/resolvers/zod';
import {
  CONTACT_KINDS,
  createClubSchema,
  type ClubView,
  type CreateClubInput,
} from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import type { ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { errorMessageKey } from '@/common/api';
import { useT, type MessageKey } from '@/common/i18n';
import CityPicker from '@/features/places/city-picker';

import { telegramHandle } from './contacts';

interface ClubFormProps {
  /** Клуб для правки. Без него форма заводит новый. */
  readonly club?: ClubView;
  /** Заполнение нового клуба — из заявки «Напишите нам» (ADR-049). */
  readonly initial?: {
    readonly name?: string;
    readonly address?: string;
    readonly tableCount?: number;
    readonly description?: string;
  };
  readonly isPending: boolean;
  readonly error: unknown;
  readonly submitLabel: string;
  readonly onSubmit: (values: CreateClubInput) => void;
}

/** Две колонки от 640px, одна на телефоне: поле во всю ширину пальца. */
const GRID = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
} as const;

/** Числовое поле: цифровая клавиатура на телефоне. */
const NUMERIC = { inputMode: 'numeric' } as const;

/**
 * Данные клуба — ТЗ 3.1, в объёме модели `Club`.
 *
 * Обязательны название и город: по ним клуб находят. Город — из
 * справочника (ADR-046). Столы заполнены
 * умолчанием — без них клуб не проводит турниров, а форма турнира берёт
 * число столов отсюда как подсказку. Остальное необязательно и пусто.
 *
 * Контакты — здесь же: Telegram, сайт, ссылка в 2GIS и главная кнопка
 * связи (ADR-055). Часы, цены, зал и картинки — на вкладке «Страница»
 * кабинета: у них свои маршруты и своё сохранение.
 */
export default function ClubForm({
  club,
  initial,
  isPending,
  error,
  submitLabel,
  onSubmit,
}: ClubFormProps): ReactNode {
  const t = useT();

  const form = useForm({
    resolver: zodResolver(createClubSchema),
    defaultValues: {
      name: club?.name ?? initial?.name ?? '',
      cityId: club?.city.id ?? '',
      tableCount: club?.tableCount ?? initial?.tableCount ?? 4,
      ...defined({
        shortName: club?.shortName,
        address: club?.address ?? initial?.address,
        phone: club?.phone,
        whatsapp: club?.whatsapp,
        instagram: club?.instagram,
        description: club?.description ?? initial?.description,
        telegram: club?.telegram,
        website: club?.website,
        twoGisUrl: club?.twoGisUrl,
        primaryContact: club?.primaryContact,
      }),
    },
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
          label={t('club.field.name')}
          {...register('name')}
          {...hint(t, errors.name === undefined ? undefined : 'error.form.name')}
        />
        <TextField
          label={t('club.field.shortName')}
          {...register('shortName', optionalText)}
          {...hint(t, undefined)}
        />
        <Controller
          control={form.control}
          name="cityId"
          render={({ field }) => (
            <CityPicker
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
              label={t('club.field.city')}
              current={club?.city}
              error={errors.cityId === undefined ? undefined : 'error.form.city'}
            />
          )}
        />
        <TextField
          label={t('club.field.address')}
          autoComplete="street-address"
          {...register('address', optionalText)}
          {...hint(t, undefined)}
        />
        <TextField
          label={t('club.field.tableCount')}
          type="number"
          {...register('tableCount', { valueAsNumber: true })}
          {...hint(
            t,
            errors.tableCount === undefined ? undefined : 'error.form.tableCount',
            NUMERIC,
          )}
        />
        <TextField
          label={t('club.field.phone')}
          type="tel"
          autoComplete="tel"
          {...register('phone', optionalText)}
          {...hint(t, undefined)}
        />
        <TextField
          label={t('club.field.whatsapp')}
          type="tel"
          {...register('whatsapp', optionalText)}
          {...hint(t, undefined)}
        />
        <TextField
          label={t('club.field.instagram')}
          {...register('instagram', optionalText)}
          {...hint(t, undefined)}
        />
        <TextField
          label={t('club.field.telegram')}
          placeholder="@club"
          {...register('telegram', {
            // Вписывают как привыкли: «@club», «t.me/club» — сервер ждёт имя.
            setValueAs: (value: string) =>
              value.trim() === '' ? undefined : telegramHandle(value),
          })}
          {...hint(t, errors.telegram === undefined ? undefined : 'error.form.telegramName')}
        />
        <TextField
          label={t('club.field.website')}
          type="url"
          placeholder="https://"
          {...register('website', optionalText)}
          {...hint(t, errors.website === undefined ? undefined : 'error.form.website')}
        />
        <TextField
          label={t('club.field.twoGisUrl')}
          type="url"
          placeholder="https://2gis.kz/…"
          {...register('twoGisUrl', optionalText)}
          {...hint(t, errors.twoGisUrl === undefined ? undefined : 'error.form.twoGis')}
        />
        <Controller
          control={form.control}
          name="primaryContact"
          render={({ field }) => (
            <TextField
              select
              label={t('club.field.primaryContact')}
              name={field.name}
              value={field.value ?? ''}
              onChange={(event) => {
                field.onChange(event.target.value === '' ? undefined : event.target.value);
              }}
              onBlur={field.onBlur}
              inputRef={field.ref}
            >
              <MenuItem value="">{t('club.field.primaryContact.auto')}</MenuItem>
              {CONTACT_KINDS.map((kind) => (
                <MenuItem key={kind} value={kind}>
                  {t(`club.contactKind.${kind}`)}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
      </Box>

      <TextField
        label={t('club.field.description')}
        multiline
        minRows={3}
        sx={{ mt: 2 }}
        {...register('description', optionalText)}
        {...hint(t, undefined)}
      />

      {error !== null && error !== undefined && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t(errorMessageKey(error))}
        </Alert>
      )}

      {/* Создание — главное действие своей страницы. Правка живёт на
          странице управления, где главное — создать турнир (ADR-039). */}
      <Button
        variant={club === undefined ? 'contained' : 'outlined'}
        size="large"
        type="submit"
        disabled={isPending}
        sx={{ mt: 3, width: { xs: '100%', sm: 'auto' } }}
      >
        {isPending ? t('common.loading') : submitLabel}
      </Button>
    </Box>
  );
}

/** Поля клуба без пустых: `null` из ответа — это незаполненное поле формы. */
function defined(
  values: Readonly<Record<string, string | null | undefined>>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}

/**
 * Подсказка под полем: ошибка объявляется чтецу экрана сразу. Пометки
 * «необязательно» нет — так же устроена форма турнира.
 */
function hint(
  t: (key: MessageKey) => string,
  error: MessageKey | undefined,
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

  return { slotProps: input };
}
