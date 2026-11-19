import { zodResolver } from '@hookform/resolvers/zod';
import { createClubApplicationSchema, type CreateClubApplicationInput } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import type { ReactNode } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { errorMessageKey } from '@/common/api';
import { useT, type MessageKey } from '@/common/i18n';

import ApplicationCityField from './city-field';
import { TRAP } from './trap';

interface ApplicationFormProps {
  readonly isPending: boolean;
  readonly error: unknown;
  readonly onSubmit: (values: CreateClubApplicationInput) => void;
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
 * Заявка клуба — ADR-047. Поля как у заявки на добавление клуба в RTTF.
 *
 * Обязательны имя, контакт, клуб и город: без них с залом не связаться.
 * Город выбирается из справочника, а если его там нет — вписывается
 * руками: заявки приходят и из городов, которых ещё нет в справочнике
 * (ADR-096).
 */
export default function ApplicationForm({
  isPending,
  error,
  onSubmit,
}: ApplicationFormProps): ReactNode {
  const t = useT();

  const form = useForm({
    resolver: zodResolver(createClubApplicationSchema),
    defaultValues: { name: '', contact: '', clubName: '', city: '' },
  });

  const { errors } = form.formState;
  const cityId = useWatch({ control: form.control, name: 'cityId' });

  /**
   * Регистрация родного поля внутри `TextField`: ссылка обязана указывать на
   * сам `<input>`, а не на обёртку, — иначе форма не прочтёт значение и не
   * поставит фокус на ошибку.
   */
  const register = (...args: Parameters<typeof form.register>) => {
    const { ref, ...rest } = form.register(...args);
    return { ...rest, inputRef: ref };
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
          label={t('apply.field.name')}
          required
          autoComplete="name"
          {...register('name')}
          {...hint(t, errors.name === undefined ? undefined : 'error.form.name')}
        />
        <TextField
          label={t('apply.field.contact')}
          required
          autoComplete="tel"
          {...register('contact')}
          {...hint(t, errors.contact === undefined ? undefined : 'error.form.contact')}
        />
        <TextField
          label={t('apply.field.clubName')}
          required
          autoComplete="organization"
          {...register('clubName')}
          {...hint(t, errors.clubName === undefined ? undefined : 'error.form.name')}
        />
        <Controller
          control={form.control}
          name="city"
          render={({ field }) => (
            <ApplicationCityField
              value={field.value}
              cityId={typeof cityId === 'string' ? cityId : undefined}
              onChange={(city, id) => {
                field.onChange(city);
                form.setValue('cityId', id);
              }}
              onBlur={field.onBlur}
              inputRef={field.ref}
              label={t('apply.field.city')}
              error={errors.city === undefined ? undefined : 'error.form.name'}
            />
          )}
        />
        <TextField
          label={t('apply.field.address')}
          autoComplete="street-address"
          {...register('address')}
          {...hint(t, undefined)}
        />
        <TextField
          label={t('apply.field.tableCount')}
          type="number"
          {...register('tableCount')}
          {...hint(
            t,
            errors.tableCount === undefined ? undefined : 'error.form.applyTables',
            NUMERIC,
          )}
        />
      </Box>

      <TextField
        label={t('apply.field.tournaments')}
        multiline
        minRows={2}
        sx={{ mt: 2 }}
        {...register('tournaments')}
        {...hint(t, undefined, undefined, t('apply.hint.tournaments'))}
      />
      <TextField
        label={t('apply.field.message')}
        multiline
        minRows={3}
        sx={{ mt: 2 }}
        {...register('message')}
        {...hint(t, undefined, undefined, t('apply.hint.message'))}
      />

      <Box aria-hidden sx={TRAP}>
        <input type="text" tabIndex={-1} autoComplete="off" {...form.register('website')} />
      </Box>

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
        {isPending ? t('common.loading') : t('apply.submit')}
      </Button>
    </Box>
  );
}

/**
 * Подсказка под полем: ошибка объявляется чтецу экрана сразу, а пояснение
 * («какие, как часто») стоит, пока ошибки нет.
 */
function hint(
  t: (key: MessageKey) => string,
  error: MessageKey | undefined,
  htmlInput?: Readonly<Record<string, unknown>>,
  note?: string,
) {
  const input = htmlInput === undefined ? {} : { htmlInput };

  if (error !== undefined) {
    return {
      error: true,
      helperText: t(error),
      slotProps: { ...input, formHelperText: { role: 'alert' } },
    };
  }

  return { ...(note === undefined ? {} : { helperText: note }), slotProps: input };
}
