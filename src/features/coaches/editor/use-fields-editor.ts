import type { CoachView, UpdateCoachInput } from '@kttf/shared/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { updateCoach } from '../api';
import { coachKeys } from '../queries';
import { coachFieldsOf, coachPatch, type CoachFieldsForm } from './form-model';

type FieldKey = Parameters<typeof coachPatch>[2][number];

/**
 * Состояние раздела, который правит поля страницы одним `PATCH`: форма,
 * сохранение только изменённого, поля с ошибкой. Вкладки «Страница» и
 * «Квалификация» правят разные поля и не мешают друг другу.
 */
export function useFieldsEditor(coach: CoachView, keys: readonly FieldKey[]) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CoachFieldsForm>(() => coachFieldsOf(coach));
  const [invalid, setInvalid] = useState<readonly string[]>([]);
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: (patch: UpdateCoachInput) => updateCoach(coach.id, patch),
    onSuccess: async () => {
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: coachKeys.all });
    },
  });

  const set = <K extends keyof CoachFieldsForm>(key: K, value: CoachFieldsForm[K]): void => {
    setSaved(false);
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const submit = (): void => {
    const result = coachPatch(coach, form, keys);

    if (result.kind === 'invalid') {
      setInvalid(result.fields);
      return;
    }

    setInvalid([]);

    if (result.kind === 'unchanged') {
      setSaved(true);
      return;
    }

    save.mutate(result.patch);
  };

  return {
    form,
    set,
    submit,
    saved,
    isPending: save.isPending,
    error: save.error,
    /** Поле не прошло проверку схемы. */
    isInvalid: (key: keyof CoachFieldsForm): boolean => invalid.includes(key),
    hasInvalid: invalid.length > 0,
  };
}
