import type { TrialFor, TrialStatus } from '@kttf/shared/types';

import { fill, type MessageKey } from '@/common/i18n';

/**
 * Заявка на пробную с сайта — ADR-059, T3 (`docs/11` 3.3.3). Адресат —
 * тот, кто записывает на тренировку: тренер своей страницей или клуб.
 * Механика входящих одна, как у контента (`features/content/owner.ts`):
 * разница — адрес (`/coaches/:id/…` или `/clubs/:id/…`) и пара текстов.
 */
export interface TrialInbox {
  readonly kind: 'COACH' | 'CLUB';
  readonly id: string;
}

export const coachInbox = (id: string): TrialInbox => ({ kind: 'COACH', id });
export const clubInbox = (id: string): TrialInbox => ({ kind: 'CLUB', id });

/** Корень маршрутов адресата. */
export function inboxPath(inbox: TrialInbox): string {
  return inbox.kind === 'CLUB' ? `/clubs/${inbox.id}` : `/coaches/${inbox.id}`;
}

/**
 * Вкладка «Заявки» в кабинете адресата — сюда ведут уведомления о новой
 * и отозванной заявке.
 */
export function inboxHref(inbox: TrialInbox): string {
  return inbox.kind === 'CLUB'
    ? `/cabinet/club/${inbox.id}?tab=requests`
    : `/cabinet/coach?tab=requests`;
}

/** «Мои заявки» на рабочем столе — сюда ведёт уведомление об ответе. */
export const MY_REQUESTS_ANCHOR = 'my-requests';
export const MY_REQUESTS_HREF = `/cabinet/trainings#${MY_REQUESTS_ANCHOR}`;

export const TRIAL_STATUS_KEYS: Readonly<Record<TrialStatus, MessageKey>> = {
  NEW: 'trial.status.NEW',
  ACCEPTED: 'trial.status.ACCEPTED',
  DECLINED: 'trial.status.DECLINED',
  CANCELLED: 'trial.status.CANCELLED',
};

/** Тон метки статуса: принятая — зелёная, новая — жёлтая, остальное — нейтрально. */
export const TRIAL_STATUS_TONES: Readonly<Record<TrialStatus, 'ink' | 'ok' | 'warn'>> = {
  NEW: 'warn',
  ACCEPTED: 'ok',
  DECLINED: 'ink',
  CANCELLED: 'ink',
};

export const TRIAL_FOR_KEYS: Readonly<Record<TrialFor, MessageKey>> = {
  SELF: 'trial.for.SELF',
  CHILD: 'trial.for.CHILD',
};

/** «Себе» или «Ребёнку, возраст: 9». */
export function forWhomText(
  request: { readonly forWhom: TrialFor; readonly childAge: number | null },
  t: (key: MessageKey) => string,
): string {
  if (request.forWhom === 'CHILD' && request.childAge !== null) {
    return fill(t('trial.childAge'), { age: String(request.childAge) });
  }

  return t(TRIAL_FOR_KEYS[request.forWhom]);
}
