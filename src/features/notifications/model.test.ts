import { notificationViewSchema, type NotificationView } from '@kttf/shared/types';
import { describe, expect, it } from 'vitest';

import { fill, formatDateTime, formatTime, type MessageKey } from '@/common/i18n';
import { ru } from '@/common/i18n/ru';

import { notificationCaption, notificationHref, notificationText } from './model';

const t = (key: MessageKey): string => ru[key];
const DUEL_ID = '00000000-0000-4000-8000-0000000000d1';

/** Уведомление дуэли — через схему: данные ровно по контракту. */
function duelNote(type: string, data: Record<string, unknown>): NotificationView {
  return notificationViewSchema.parse({
    id: '00000000-0000-4000-8000-0000000000a1',
    type,
    readAt: null,
    createdAt: '2026-10-24T09:00:00.000Z',
    data: { duelId: DUEL_ID, kind: 'DUEL', playerName: 'Смагулов Асан', ...data },
  });
}

describe('уведомления дуэлей (ADR-065)', () => {
  it('все восемь типов ведут на страницу дуэли с подписью раздела', () => {
    const notes = [
      duelNote('DUEL_CHALLENGE', { rated: true }),
      duelNote('DUEL_RESPONSE', { responseId: '00000000-0000-4000-8000-0000000000e9' }),
      duelNote('DUEL_SCHEDULED', { startsAt: '2026-11-07T13:00:00.000Z' }),
      duelNote('DUEL_DECLINED', { reason: 'TAKEN' }),
      duelNote('DUEL_CANCELLED', { reason: null }),
      duelNote('DUEL_RESULT', {
        setsFor: 1,
        setsAgainst: 3,
        confirmBy: '2026-10-26T09:00:00.000Z',
      }),
      duelNote('DUEL_COMPLETED', { delta: '6.2' }),
      duelNote('DUEL_DISPUTED', {}),
    ];

    for (const note of notes) {
      expect(notificationHref(note)).toBe(`/duels/${DUEL_ID}`);
      expect(notificationCaption(note, t)).toBe(ru['notifications.duels']);
      expect(notificationText(note, t, 'ru')).toContain('Смагулов Асан');
    }
  });

  it('текст по случаю: вид вызова, причина отказа, счёт и срок, изменение рейтинга', () => {
    const player = 'Смагулов Асан';

    expect(
      notificationText(duelNote('DUEL_CHALLENGE', { kind: 'SPARRING', rated: false }), t, 'ru'),
    ).toBe(fill(ru['notifications.DUEL_CHALLENGE_SPARRING'], { player }));
    expect(notificationText(duelNote('DUEL_DECLINED', { reason: 'TAKEN' }), t, 'ru')).toBe(
      fill(ru['notifications.DUEL_DECLINED_TAKEN'], { player }),
    );
    expect(notificationText(duelNote('DUEL_CANCELLED', { reason: 'Заболел' }), t, 'ru')).toBe(
      fill(ru['notifications.DUEL_CANCELLED_REASON'], { player, reason: 'Заболел' }),
    );
    expect(
      notificationText(
        duelNote('DUEL_RESULT', {
          setsFor: 1,
          setsAgainst: 3,
          confirmBy: '2026-10-26T09:00:00.000Z',
        }),
        t,
        'ru',
      ),
    ).toBe(
      fill(ru['notifications.DUEL_RESULT'], {
        player,
        score: '1:3',
        until: formatDateTime('2026-10-26T09:00:00.000Z', 'ru'),
      }),
    );
    expect(notificationText(duelNote('DUEL_COMPLETED', { delta: '6.2' }), t, 'ru')).toBe(
      fill(ru['notifications.DUEL_COMPLETED_RATED'], { player, delta: '+6.20' }),
    );
    expect(notificationText(duelNote('DUEL_COMPLETED', { delta: null }), t, 'ru')).toBe(
      fill(ru['notifications.DUEL_COMPLETED'], { player }),
    );
  });
});

describe('перенос и напоминание (ADR-068)', () => {
  const player = 'Смагулов Асан';
  const startsAt = '2026-10-24T15:00:00.000Z';

  it('перенос: предложен, принят, отклонён — с новым временем и ссылкой на дуэль', () => {
    for (const action of ['PROPOSED', 'ACCEPTED', 'DECLINED'] as const) {
      const note = duelNote('DUEL_RESCHEDULE', { startsAt, action });

      expect(notificationText(note, t, 'ru')).toBe(
        fill(ru[`notifications.DUEL_RESCHEDULE_${action}`], {
          player,
          when: formatDateTime(startsAt, 'ru'),
        }),
      );
      expect(notificationHref(note)).toBe(`/duels/${DUEL_ID}`);
      expect(notificationCaption(note, t)).toBe(ru['notifications.duels']);
    }
  });

  it('напоминание в тот же день — «Сегодня в 20:00 … с кем, где»', () => {
    const note = notificationViewSchema.parse({
      id: '00000000-0000-4000-8000-0000000000a2',
      type: 'DUEL_REMINDER',
      readAt: null,
      createdAt: '2026-10-24T12:00:00.000Z',
      data: {
        duelId: DUEL_ID,
        kind: 'DUEL',
        playerName: player,
        startsAt,
        venueName: 'Клуб «Спин»',
      },
    });

    expect(notificationText(note, t, 'ru')).toBe(
      fill(ru['notifications.DUEL_REMINDER_TODAY'], {
        player,
        time: formatTime(startsAt, 'ru'),
        venue: 'Клуб «Спин»',
      }),
    );
    expect(notificationHref(note)).toBe(`/duels/${DUEL_ID}`);
  });
});
