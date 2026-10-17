import { zodResolver } from '@hookform/resolvers/zod';
import { createCountrySchema, type CountryView, type CreateCountryInput } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';

import { createCountry, updateCountry } from './api';
import { fieldHint, optionalNumber, optionalText } from './field-hint';
import { countryPatch } from './place-patch';
import { placeKeys } from './queries';

interface CountryDialogProps {
  /** Страна для правки. Без неё диалог заводит новую. */
  readonly country?: CountryView | undefined;
  readonly onClose: () => void;
}

/**
 * Страна справочника: заведение и правка — ADR-046.
 *
 * Скрытие — переключателем в таблице, а не здесь: удаления нет, и скрыть
 * запись — отдельное решение, а не одно из полей формы.
 */
export default function CountryDialog({ country, onClose }: CountryDialogProps): ReactNode {
  const t = useT();
  const formId = useId();
  const titleId = useId();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(createCountrySchema),
    defaultValues: {
      code: country?.code ?? '',
      name: country?.name ?? '',
      ...(typeof country?.nameKk === 'string' ? { nameKk: country.nameKk } : {}),
      ...(country === undefined ? {} : { sortOrder: country.sortOrder }),
    },
  });
  const { errors } = form.formState;

  const save = useMutation({
    mutationFn: (values: CreateCountryInput) => {
      if (country === undefined) return createCountry(values);

      const patch = countryPatch(country, values);
      return patch === null ? Promise.resolve(country) : updateCountry(country.id, patch);
    },
    onSuccess: async () => {
      // Справочник целиком: открытые списки форм и фильтров тоже устарели.
      await queryClient.invalidateQueries({ queryKey: placeKeys.all });
      onClose();
    },
  });

  const register = (...args: Parameters<typeof form.register>) => {
    const { ref, ...rest } = form.register(...args);
    return { ...rest, inputRef: ref };
  };

  return (
    <Dialog open fullWidth maxWidth="xs" onClose={onClose} aria-labelledby={titleId}>
      <DialogTitle id={titleId}>
        {t(country === undefined ? 'places.country.new' : 'places.country.edit')}
      </DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id={formId}
          noValidate
          spacing={2}
          sx={{ pt: 1 }}
          onSubmit={(event) => {
            void form.handleSubmit((values) => {
              save.mutate(values);
            })(event);
          }}
        >
          <TextField
            label={t('places.field.code')}
            autoComplete="off"
            {...register('code')}
            {...fieldHint(t, errors.code === undefined ? undefined : 'error.form.countryCode')}
          />
          <TextField
            label={t('places.field.name')}
            autoComplete="off"
            {...register('name')}
            {...fieldHint(t, errors.name === undefined ? undefined : 'error.form.placeName')}
          />
          <TextField
            label={t('places.field.nameKk')}
            autoComplete="off"
            {...register('nameKk', optionalText)}
            {...fieldHint(t, errors.nameKk === undefined ? undefined : 'error.form.placeName')}
          />
          <TextField
            label={t('places.field.sortOrder')}
            {...register('sortOrder', optionalNumber)}
            {...fieldHint(
              t,
              errors.sortOrder === undefined ? undefined : 'error.form.sortOrder',
              true,
            )}
          />
          {save.error !== null && <Alert severity="error">{t(errorMessageKey(save.error))}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="text" onClick={onClose} sx={{ minHeight: 44 }}>
          {t('places.cancel')}
        </Button>
        <Button
          variant="contained"
          type="submit"
          form={formId}
          disabled={save.isPending}
          sx={{ minHeight: 44 }}
        >
          {save.isPending ? t('common.loading') : t('places.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
