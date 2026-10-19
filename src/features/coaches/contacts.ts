import type { CoachView, ContactKind } from '@kttf/shared/types';

import { fill, type MessageKey } from '@/common/i18n';
import { primaryContactOf } from '@/features/clubs/contacts';

/**
 * Связь с тренером — как у клуба (ADR-055, решение 3): главный способ —
 * единственная кнопка `primary`, в WhatsApp уходит готовый текст. Тренер
 * видит, что человек пришёл с KTTF, а мы не храним ничьих контактов.
 */

/** Цель обращения — быстрые запросы под тренировками (`docs/11` 3.1). */
export const COACH_REQUESTS = ['trial', 'child', 'group', 'question'] as const;
export type CoachRequest = (typeof COACH_REQUESTS)[number];

export const COACH_REQUEST_LABELS: Readonly<Record<CoachRequest, MessageKey>> = {
  trial: 'coach.request.trial',
  child: 'coach.request.child',
  group: 'coach.request.group',
  question: 'coach.request.question',
};

const REQUEST_MESSAGES: Readonly<Record<CoachRequest, MessageKey>> = {
  trial: 'coach.request.trialMessage',
  child: 'coach.request.childMessage',
  group: 'coach.request.groupMessage',
  question: 'coach.request.questionMessage',
};

/**
 * Готовый текст: приветствие по имени, «пишу со страницы тренера на KTTF»
 * и цель, если она выбрана. Без цели — только первые две части.
 */
export function coachMessage(
  firstName: string,
  t: (key: MessageKey) => string,
  request?: CoachRequest,
): string {
  const greeting = fill(t('coach.contact.message'), { name: firstName });

  return request === undefined ? greeting : `${greeting} ${t(REQUEST_MESSAGES[request])}`;
}

/** Главный способ связи: выбранный тренером, если заполнен, иначе первый из WhatsApp, телефона, Telegram. */
export function primaryCoachContact(
  coach: Pick<CoachView, 'primaryContact' | 'phone' | 'whatsapp' | 'telegram'>,
): ContactKind | null {
  return primaryContactOf(coach);
}
