import {
  trainingOwner,
  type ContactKind,
  type TrainingOwner,
  type TrainingView,
} from '@kttf/shared/types';

import { fill, type MessageKey } from '@/common/i18n';
import { phoneHref, telegramHref, whatsappHref } from '@/features/clubs/contacts';
import { trackClubContact } from '@/features/clubs/track';

import { LINK_KEYS_FOR_CLUB, LINK_KEYS_FOR_COACH, TRAINING_PLACE_KEYS } from './labels';
import { trackCoachContact } from './track';

/**
 * «Записаться» на тренировку (ADR-059, решение владельца от 20.10.2026):
 * пишут владельцу — клубу за его группу, тренеру за его тренировку. Правило
 * владельца одно на всех — `trainingOwner` из общего кода.
 */

type T = (key: MessageKey) => string;

interface Contacts {
  readonly phone: string | null;
  readonly whatsapp: string | null;
  readonly telegram: string | null;
}

/**
 * Вторая сторона тренировки, которой нажатие тоже засчитывается отдельной
 * строкой (решение владельца от 21.10.2026): тренер группы клуба или клуб
 * KTTF, в зале которого тренер проводит свою тренировку.
 */
export type EnrollPartner =
  { readonly kind: 'COACH'; readonly id: string } | { readonly kind: 'CLUB'; readonly id: string };

export interface EnrollAction {
  readonly kind: ContactKind;
  readonly href: string;
  /** WhatsApp и Telegram — в новой вкладке, звонок — на месте. */
  readonly external: boolean;
  readonly owner: TrainingOwner;
  readonly partner: EnrollPartner | null;
}

/** Вторая сторона: у группы клуба — её тренер, у тренировки тренера — клуб-место. */
export function enrollPartner(
  training: Pick<TrainingView, 'author' | 'club' | 'coach'>,
): EnrollPartner | null {
  if (training.author === 'CLUB') {
    return training.coach === null ? null : { kind: 'COACH', id: training.coach.id };
  }

  return training.club === null ? null : { kind: 'CLUB', id: training.club.id };
}

/** Контакты владельца. */
export function ownerContacts(owner: TrainingOwner): Contacts {
  return owner.kind === 'CLUB' ? owner.club : owner.coach;
}

/**
 * Где проходит — для готового текста: «клуб „Спин“», зал по названию,
 * «выезд» или «онлайн».
 */
function placeForMessage(training: Pick<TrainingView, 'place' | 'club' | 'venue'>, t: T): string {
  if (training.club !== null) return fill(t('training.enroll.club'), { club: training.club.name });
  if (training.venue !== null) return training.venue.name;

  return t(TRAINING_PLACE_KEYS[training.place]).toLowerCase();
}

/**
 * Готовый текст: «Здравствуйте! Пишу с KTTF: хочу записаться на
 * „Вечерняя группа“, вт, чт 19:30, клуб „Спин“». Владелец сразу видит, про
 * какую тренировку речь, а мы не храним ничьих контактов.
 */
export function enrollMessage(
  training: Pick<TrainingView, 'title' | 'schedule' | 'place' | 'club' | 'venue'>,
  t: T,
): string {
  const parts = [
    fill(t('training.enroll.message'), { title: training.title }),
    ...(training.schedule === null ? [] : [training.schedule]),
    placeForMessage(training, t),
  ];

  return parts.join(', ');
}

/**
 * Куда ведёт «Записаться»: WhatsApp с готовым текстом, без него — звонок,
 * без телефона — Telegram. Нет ни одного контакта или владельца не видно —
 * `null`, и кнопки нет.
 */
export function enrollAction(
  training: Pick<
    TrainingView,
    'author' | 'club' | 'coach' | 'title' | 'schedule' | 'place' | 'venue'
  >,
  t: T,
): EnrollAction | null {
  const owner = trainingOwner(training);

  if (owner === null) return null;

  const contacts = ownerContacts(owner);
  const partner = enrollPartner(training);

  if (contacts.whatsapp !== null) {
    return {
      kind: 'WHATSAPP',
      href: whatsappHref(contacts.whatsapp, enrollMessage(training, t)),
      external: true,
      owner,
      partner,
    };
  }
  if (contacts.phone !== null) {
    return { kind: 'PHONE', href: phoneHref(contacts.phone), external: false, owner, partner };
  }
  if (contacts.telegram !== null) {
    return {
      kind: 'TELEGRAM',
      href: telegramHref(contacts.telegram),
      external: true,
      owner,
      partner,
    };
  }

  return null;
}

/**
 * Нажатие считается обеим сторонам (решение владельца от 21.10.2026):
 * владельцу — обычным обращением по каналу, второй стороне — отдельной
 * строкой. Тренеру группы клуба — «записи в группы клуба» (`CLUB_GROUP`),
 * клубу, в зале которого тренер проводит своё, — «записи к тренерам в
 * зале» (`COACH_TRAINING`). В прямые обращения второй стороны они не идут:
 * писали не ей.
 */
export function trackEnroll(action: Pick<EnrollAction, 'kind' | 'owner' | 'partner'>): void {
  if (action.owner.kind === 'CLUB') trackClubContact(action.owner.club.id, action.kind);
  else trackCoachContact(action.owner.coach.id, action.kind);

  if (action.partner?.kind === 'COACH') trackCoachContact(action.partner.id, 'CLUB_GROUP');
  if (action.partner?.kind === 'CLUB') trackClubContact(action.partner.id, 'COACH_TRAINING');
}

/**
 * Связь, ждущая ответа или отклонённая, — глазами любого смотрящего:
 * тренировку тренера подтверждает клуб, группу клуба — тренер. Публично
 * таких строк нет: их видят стороны и администратор.
 */
export function linkStateKey(training: Pick<TrainingView, 'author' | 'link'>): MessageKey | null {
  if (training.link !== 'PENDING' && training.link !== 'DECLINED') return null;

  return training.author === 'COACH'
    ? LINK_KEYS_FOR_COACH[training.link]
    : LINK_KEYS_FOR_CLUB[training.link];
}

/** Тренировки по владельцу: группы клуба и личные тренировки тренеров. */
export function splitByOwner<T extends Pick<TrainingView, 'author'>>(
  trainings: readonly T[],
): { readonly club: T[]; readonly coach: T[] } {
  return {
    club: trainings.filter((training) => training.author === 'CLUB'),
    coach: trainings.filter((training) => training.author === 'COACH'),
  };
}
