import {
  trainingBookingTarget,
  type ContactKind,
  type TrainingOwner,
  type TrainingView,
} from '@kttf/shared/types';

import { fill, type Locale, type MessageKey } from '@/common/i18n';
import { phoneHref, telegramHref, whatsappHref } from '@/features/clubs/contacts';
import { trackClubContact } from '@/features/clubs/track';

import {
  LINK_KEYS_FOR_CLUB,
  LINK_KEYS_FOR_COACH,
  TRAINING_PLACE_KEYS,
  coachShortName,
} from './labels';
import { fullScheduleText } from './schedule';
import { trackCoachContact } from './track';

/**
 * «Записаться» на тренировку (ADR-059, решения владельца от 20–21.10.2026):
 * пишут тому, кто записывает и принимает оплату, — клубу за его группу,
 * тренеру за его тренировку, а если тренер записывает через клуб — клубу.
 * Правило одно на всех — `trainingBookingTarget` из общего кода; авторство
 * (`trainingOwner`) только раскладывает списки.
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
  /**
   * Кому пишут — адресат записи, `trainingBookingTarget`: клуб у группы
   * клуба и у тренировки тренера с записью через клуб, иначе тренер.
   */
  readonly owner: TrainingOwner;
  readonly partner: EnrollPartner | null;
}

/**
 * Вторая сторона — не адресат: пишут клубу — тренер тренировки, пишут
 * тренеру — клуб KTTF, в зале которого она проходит.
 */
export function enrollPartner(
  target: TrainingOwner,
  training: Pick<TrainingView, 'club' | 'coach'>,
): EnrollPartner | null {
  if (target.kind === 'CLUB') {
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
  training: Pick<TrainingView, 'title' | 'slots' | 'schedule' | 'place' | 'club' | 'venue'>,
  t: T,
  locale: Locale,
): string {
  const schedule = fullScheduleText(training, locale);
  const parts = [
    fill(t('training.enroll.message'), { title: training.title }),
    ...(schedule === null ? [] : [schedule]),
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
    'author' | 'booking' | 'club' | 'coach' | 'title' | 'slots' | 'schedule' | 'place' | 'venue'
  >,
  t: T,
  locale: Locale,
): EnrollAction | null {
  const owner = trainingBookingTarget(training);

  if (owner === null) return null;

  const contacts = ownerContacts(owner);
  const partner = enrollPartner(owner, training);

  if (contacts.whatsapp !== null) {
    return {
      kind: 'WHATSAPP',
      href: whatsappHref(contacts.whatsapp, enrollMessage(training, t, locale)),
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
 * адресату — обычным обращением по каналу, второй стороне — отдельной
 * строкой. Пишут клубу — тренеру «записи через клуб» (`CLUB_GROUP`); пишут
 * тренеру в зале клуба KTTF — клубу «записи к тренерам в зале»
 * (`COACH_TRAINING`). В прямые обращения второй стороны они не идут:
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

/**
 * Подпись блока «Запись и оплата» — кто записывает и как он связан со
 * второй стороной (замечание владельца: связь должна быть явной):
 * «Записывает клуб X, тренер группы — Y», «Записывает тренер Y лично»,
 * «Тренер Y проводит в зале клуба X, записывает клуб».
 */
export function bookingCaption(
  training: Pick<TrainingView, 'author' | 'booking' | 'club' | 'coach'>,
  t: T,
): string | null {
  const target = trainingBookingTarget(training);

  if (target === null) return null;

  if (target.kind === 'COACH') {
    return fill(t('training.booking.coach'), { coach: coachShortName(target.coach.player) });
  }
  if (training.author === 'COACH' && training.coach !== null) {
    return fill(t('training.booking.coachViaClub'), {
      coach: coachShortName(training.coach.player),
      club: target.club.name,
    });
  }

  const club = fill(t('training.booking.club'), { club: target.club.name });

  return training.coach === null
    ? club
    : `${club}, ${fill(t('training.booking.groupCoach'), {
        coach: coachShortName(training.coach.player),
      })}`;
}
