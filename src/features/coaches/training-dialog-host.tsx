import { useLocation } from '@tanstack/react-router';
import { lazy, Suspense, useMemo, type ReactNode } from 'react';

import { TrainingDialogContext, type TrainingDialogApi } from './training-dialog-context';

/**
 * Окно грузится своим чанком: списку тренировок оно нужно только по
 * нажатию, а ссылка из рекламы (`?training=`) подтянет его сразу.
 */
const TrainingDialog = lazy(() => import('./training-dialog'));

interface TrainingDialogHostProps {
  /** `?training=` текущей страницы. */
  readonly trainingId: string | undefined;
  /** Открыть другую тренировку: новая запись истории, «Назад» вернёт прежнюю. */
  readonly onOpen: (trainingId: string) => void;
  /** Закрыть: параметр уходит из адреса. */
  readonly onClose: () => void;
  readonly children: ReactNode;
}

/**
 * Хозяин окна на странице: даёт строкам способ открыть окно и рисует
 * его, когда в адресе есть `?training=`. «Назад» в браузере закрывает
 * окно сам собой — параметр просто уходит из адреса.
 */
export default function TrainingDialogHost({
  trainingId,
  onOpen,
  onClose,
  children,
}: TrainingDialogHostProps): ReactNode {
  const location = useLocation();
  const api = useMemo<TrainingDialogApi>(
    () => ({
      hrefFor: (id) => {
        const search = new URLSearchParams(location.searchStr);
        search.set('training', id);

        return `${location.pathname}?${search.toString()}`;
      },
      open: onOpen,
    }),
    [location.pathname, location.searchStr, onOpen],
  );

  return (
    <TrainingDialogContext value={api}>
      {children}
      {trainingId !== undefined && (
        <Suspense fallback={null}>
          <TrainingDialog trainingId={trainingId} onClose={onClose} onOpen={onOpen} />
        </Suspense>
      )}
    </TrainingDialogContext>
  );
}
