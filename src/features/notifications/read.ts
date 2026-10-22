import { useMutation, useQueryClient } from '@tanstack/react-query';

import { readNotifications } from './api';
import { notificationKeys } from './queries';

/** Отметить прочитанными — эти или, без `ids`, все; число на колокольчике обновится. */
export function useReadNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids?: readonly string[]) =>
      readNotifications(ids === undefined ? {} : { ids: [...ids] }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
