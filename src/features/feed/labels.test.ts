import type { FeedItem } from '@kttf/shared/types';
import { describe, expect, it } from 'vitest';

import { foldAchievements, postTitle, sourceHref } from './labels';
import { formatAgo } from './time';

const player = (id: string) =>
  ({ kind: 'PLAYER', id, name: 'Ким Артём', imageUrl: null, slug: null }) as const;
const tournament = { id: 't-1', name: 'Кубок', startsAt: '2026-10-18T10:00:00.000Z' };

function medal(id: string, playerId: string): FeedItem {
  return {
    id,
    type: 'ACHIEVEMENT',
    at: '2026-10-18T12:00:00.000Z',
    source: player(playerId),
    discussion: null,
    achievement: { kind: 'MEDAL', place: 1, tournament },
  };
}

const result: FeedItem = {
  id: 'result:t-1',
  type: 'RESULT',
  at: '2026-10-18T12:00:00.000Z',
  source: { kind: 'CLUB', id: 'c-1', name: 'KTTF Тест', imageUrl: null, slug: null },
  discussion: null,
  tournament: { ...tournament, club: { id: 'c-1', name: 'KTTF Тест' } },
  participants: 8,
  places: [],
};

describe('лента — ADR-073', () => {
  it('достижения одного игрока подряд — одной карточкой', () => {
    const entries = foldAchievements([
      medal('m1', 'p1'),
      medal('m2', 'p1'),
      medal('m3', 'p2'),
      result,
      medal('m4', 'p2'),
    ]);

    expect(entries.map((entry) => [entry.item.id, entry.also.map((item) => item.id)])).toEqual([
      ['m1', ['m2']],
      ['m3', []],
      ['result:t-1', []],
      ['m4', []],
    ]);
  });

  it('заголовок записи — первая строка, короткая — запасной', () => {
    expect(postTitle('Новая ракетка\nподробности ниже', 'Запись')).toBe('Новая ракетка');
    expect(postTitle('ок', 'Запись')).toBe('Запись');
    expect(postTitle('а'.repeat(120), 'Запись')).toHaveLength(80);
  });

  it('страница источника: клуб и игрок — по id, тренер — по адресу, KTTF — никуда', () => {
    expect(sourceHref(player('p1'))).toBe('/players/p1');
    expect(sourceHref({ kind: 'COACH', id: 'x', name: 'Т', imageUrl: null, slug: 'ivanov' })).toBe(
      '/coaches/ivanov',
    );
    expect(sourceHref({ kind: 'KTTF', id: null, name: 'KTTF', imageUrl: null, slug: null })).toBe(
      null,
    );
  });

  it('время — «назад», старше недели — датой', () => {
    const now = new Date('2026-10-25T12:00:00.000Z');

    expect(formatAgo('2026-10-25T11:30:00.000Z', 'ru', now)).toMatch(/30 мин/);
    expect(formatAgo('2026-10-25T09:00:00.000Z', 'ru', now)).toMatch(/3 ч/);
    expect(formatAgo('2026-10-01T09:00:00.000Z', 'ru', now)).toMatch(/1 октября/);
  });
});
