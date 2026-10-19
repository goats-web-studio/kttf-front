import { ERROR_CODES, isAppError } from '@kttf/shared/errors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import { reloadUser } from '@/features/auth/session';

import { createCoach } from './api';
import { coachKeys } from './queries';

/**
 * «Стать тренером» (`docs/11` 3.1): страница заводится черновиком, сессия
 * перечитывается — `user.coach` появляется в кабинете без повторного
 * входа, — и человек попадает в редактор. Если страница уже есть (вторая
 * вкладка, двойное нажатие), это не ошибка: ведём туда же.
 */
export function useBecomeCoach() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        await createCoach();
      } catch (error) {
        if (!isAppError(error) || error.code !== ERROR_CODES.COACH_ALREADY_EXISTS) throw error;
      }

      await reloadUser();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: coachKeys.all });
      await navigate({ to: '/cabinet/coach' });
    },
  });
}
