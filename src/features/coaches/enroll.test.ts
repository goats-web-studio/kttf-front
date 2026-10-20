import { describe, expect, it } from 'vitest';

import type { MessageKey } from '@/common/i18n';
import { ru } from '@/common/i18n/ru';
import {
  CLUB_EVENING,
  CLUB_REF,
  COACH_REF,
  KIDS_GROUP,
  VENUE_TRAINING,
  VISIT_TRAINING,
} from '@/test/coach-fixtures';

import { enrollAction, enrollMessage, splitByOwner } from './enroll';

const t = (key: MessageKey): string => ru[key];

/** Текст из ссылки wa.me. */
function textOf(href: string): string {
  return decodeURIComponent(href.split('text=')[1] ?? '');
}

describe('«Записаться» — владельцу тренировки', () => {
  it('группа клуба — пишут клубу, тренер в ней только указан', () => {
    const action = enrollAction(CLUB_EVENING, t);

    expect(action?.owner.kind).toBe('CLUB');
    expect(action?.kind).toBe('WHATSAPP');
    expect(action?.href.startsWith('https://wa.me/77770000000?text=')).toBe(true);
  });

  it('своя тренировка тренера в клубе — пишут тренеру, клуб в ней — место', () => {
    const action = enrollAction(KIDS_GROUP, t);

    expect(action?.owner.kind).toBe('COACH');
    expect(action?.href.startsWith('https://wa.me/77011234567?text=')).toBe(true);
  });

  it('готовый текст: название, расписание и место', () => {
    expect(enrollMessage(CLUB_EVENING, t)).toBe(
      `Здравствуйте! Пишу с KTTF: хочу записаться на «Вечерняя группа», вт, чт 19:00, клуб «${CLUB_REF.name}»`,
    );
    expect(enrollMessage(VENUE_TRAINING, t)).toBe(
      'Здравствуйте! Пишу с KTTF: хочу записаться на «Спарринг», Спортзал школы №5',
    );
    expect(enrollMessage(VISIT_TRAINING, t)).toBe(
      'Здравствуйте! Пишу с KTTF: хочу записаться на «Индивидуальная тренировка», выезд',
    );
    expect(textOf(enrollAction(KIDS_GROUP, t)?.href ?? '')).toContain(
      '«Детская группа», пн, ср, пт 18:00–19:30',
    );
  });

  it('без WhatsApp — звонок, без телефона — Telegram, без контактов — кнопки нет', () => {
    const coach = (contacts: Partial<typeof COACH_REF>) => ({
      ...VISIT_TRAINING,
      coach: { ...COACH_REF, ...contacts },
    });

    expect(enrollAction(coach({ whatsapp: null }), t)).toMatchObject({
      kind: 'PHONE',
      href: 'tel:+77011234567',
      external: false,
    });
    expect(enrollAction(coach({ whatsapp: null, phone: null }), t)).toMatchObject({
      kind: 'TELEGRAM',
      href: 'https://t.me/coach_ivanov',
    });
    expect(enrollAction(coach({ whatsapp: null, phone: null, telegram: null }), t)).toBeNull();
  });

  it('владельца не видно — кнопки нет', () => {
    expect(enrollAction({ ...CLUB_EVENING, club: null }, t)).toBeNull();
    expect(enrollAction({ ...VISIT_TRAINING, coach: null }, t)).toBeNull();
  });

  it('разделение по владельцу: группы клуба и тренировки тренеров', () => {
    const parts = splitByOwner([KIDS_GROUP, CLUB_EVENING, VENUE_TRAINING]);

    expect(parts.club.map((training) => training.id)).toEqual([CLUB_EVENING.id]);
    expect(parts.coach.map((training) => training.id)).toEqual([KIDS_GROUP.id, VENUE_TRAINING.id]);
  });
});
