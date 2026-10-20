import { createContext, use } from 'react';

/**
 * Окно тренировки поверх страницы — «Подробнее» (ADR-059, замечание
 * владельца: отдельная страница выглядела пустой). Строки списка не знают,
 * на какой они странице: адрес окна и способ его открыть даёт страница,
 * на которой окно живёт (`/trainings`, `/clubs/:id`, `/coaches/:slug`).
 */
export interface TrainingDialogApi {
  /** Адрес текущей страницы с `?training=<id>` — для ссылки и новой вкладки. */
  readonly hrefFor: (trainingId: string) => string;
  /** Открыть окно на месте, без перехода со страницы. */
  readonly open: (trainingId: string) => void;
}

/** Без страницы-хозяина окно открывается в разделе «Тренировки». */
const FALLBACK: TrainingDialogApi = {
  hrefFor: (trainingId) => `/trainings?training=${trainingId}`,
  open: (trainingId) => {
    window.location.assign(`/trainings?training=${trainingId}`);
  },
};

export const TrainingDialogContext = createContext<TrainingDialogApi>(FALLBACK);

export function useTrainingDialog(): TrainingDialogApi {
  return use(TrainingDialogContext);
}
