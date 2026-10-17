import { zodResolver } from '@hookform/resolvers/zod';
import { createCitySchema, type CityView } from '@kttf/shared/types';
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

import { createCity, updateCity } from './api';
import { fieldHint, optionalNumber, optionalText } from './field-hint';
import { cityPatch, type CityFormValues } from './place-patch';
import { placeKeys } from './queries';

/** Поля города без страны: она задана выбором в таблице и не меняется. */
const cityFormSchema = createCitySchema.omit({ countryId: true });

interface CityDialogProps {
  /** Страна нового города. */
  readonly countryId: string;
  /** Город для правки. Без него диалог заводит новый. */
  readonly city?: CityView | undefined;
  readonly onClose: () => void;
}

/**
 * Город справочника: заведение и правка — ADR-046.
 *
 * Страны в форме нет: город, оказавшийся не в той стране, — опечатка при
 * заведении, и правится она новой записью (контракт `updateCitySchema`).
 */
export default function CityDialog({ countryId, city, onClose }: CityDialogProps): ReactNode {
  const t = useT();
  const formId = useId();
  const titleId = useId();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(cityFormSchema),
    defaultValues: {
      name: city?.name ?? '',
      ...(typeof city?.nameKk === 'string' ? { nameKk: city.nameKk } : {}),
      ...(city === undefined ? {} : { sortOrder: city.sortOrder }),
    },
  });
  const { errors } = form.formState;

  const save = useMutation({
    mutationFn: (values: CityFormValues) => {
      if (city === undefined) return createCity({ ...values, countryId });

      const patch = cityPatch(city, values);
      return patch === null ? Promise.resolve(city) : updateCity(city.id, patch);
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
        {t(city === undefined ? 'places.city.new' : 'places.city.edit')}
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
