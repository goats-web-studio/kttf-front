import type { CoachView } from '@kttf/shared/types';

import { fill, type MessageKey } from '@/common/i18n';

type StatusFields = Pick<CoachView, 'status' | 'rejectReason' | 'hidden' | 'hiddenReason'>;

/** Тон плашки статуса: опубликована — спокойно, отказ и скрытие — предупреждением. */
export type CoachStatusTone = 'ok' | 'neutral' | 'warn';

/**
 * Статус страницы словами — для плашки в кабинете и на самой странице
 * (`docs/11` 5.4): «Черновик», «На проверке», «Отклонено: причина»,
 * «Опубликовано», «Скрыта: причина». Скрытие важнее статуса заявки:
 * скрытую опубликованную всё равно никто не видит.
 */
export function coachStatusText(coach: StatusFields, t: (key: MessageKey) => string): string {
  if (coach.hidden) {
    return coach.hiddenReason === null
      ? t('coach.state.hidden')
      : fill(t('coach.state.hiddenReason'), { reason: coach.hiddenReason });
  }

  switch (coach.status) {
    case 'DRAFT':
      return t('coach.state.draft');
    case 'PENDING':
      return t('coach.state.pending');
    case 'APPROVED':
      return t('coach.state.published');
    case 'REJECTED':
      return coach.rejectReason === null
        ? t('coach.state.rejected')
        : fill(t('coach.state.rejectedReason'), { reason: coach.rejectReason });
  }
}

export function coachStatusTone(coach: StatusFields): CoachStatusTone {
  if (coach.hidden || coach.status === 'REJECTED') return 'warn';

  return coach.status === 'APPROVED' ? 'ok' : 'neutral';
}
