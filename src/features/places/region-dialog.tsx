import { zodResolver } from '@hookform/resolvers/zod';
import { createRegionSchema, type RegionView } from '@kttf/shared/types';
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

import { createRegion, updateRegion } from './api';
import { fieldHint, optionalNumber, optionalText } from './field-hint';
import { regionPatch, type RegionFormValues } from './place-patch';
import { placeKeys } from './queries';

/** Поля области без страны: она задана выбором на странице и не меняется. */
const regionFormSchema = createRegionSchema.omit({ countryId: true });

interface RegionDialogProps {
  /** Страна новой области. */
  readonly countryId: string;
  /** Область для правки. Без неё диалог заводит новую. */
  readonly region?: RegionView | undefined;
  readonly onClose: () => void;
}

/**
 * Область справочника: заведение и правка — ADR-096.
 *
 * Как у города: страны в форме нет, скрытие — переключателем в таблице.
 * Города раскладываются по областям в диалоге города.
 */
export default function RegionDialog({ countryId, region, onClose }: RegionDialogProps): ReactNode {
  const t = useT();
  const formId = useId();
  const titleId = useId();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(regionFormSchema),
    defaultValues: {
      name: region?.name ?? '',
      ...(typeof region?.nameKk === 'string' ? { nameKk: region.nameKk } : {}),
      ...(region === undefined ? {} : { sortOrder: region.sortOrder }),
    },
  });
  const { errors } = form.formState;

  const save = useMutation({
    mutationFn: (values: RegionFormValues) => {
      if (region === undefined) return createRegion({ ...values, countryId });

      const patch = regionPatch(region, values);
      return patch === null ? Promise.resolve(region) : updateRegion(region.id, patch);
    },
    onSuccess: async () => {
      // Справочник целиком: фильтры и выбор города тоже устарели.
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
        {t(region === undefined ? 'places.region.new' : 'places.region.edit')}
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
