import type { ForumSubject } from '@kttf/shared/types';
import { describe, expect, it } from 'vitest';

import { ru } from '@/common/i18n/ru';

import {
  SUBJECT_KEYS,
  forumImageVariant,
  isNews,
  lastPage,
  subjectHref,
  topicHref,
} from './labels';

const TOPIC = '11111111-1111-4111-8111-111111111111';
const CLUB = '22222222-2222-4222-8222-222222222222';

describe('topicHref', () => {
  it('без номера — тема', () => {
    expect(topicHref(TOPIC)).toBe(`/forum/topics/${TOPIC}`);
  });

  it('первое сообщение — статья над ответами, без страницы', () => {
    expect(topicHref(TOPIC, 1)).toBe(`/forum/topics/${TOPIC}#post-1`);
  });

  it('ответ — страница по порядку: в обсуждении турнира иначе новые сверху (ADR-067)', () => {
    expect(topicHref(TOPIC, 2)).toBe(`/forum/topics/${TOPIC}?sort=OLD#post-2`);
    expect(topicHref(TOPIC, 21)).toBe(`/forum/topics/${TOPIC}?sort=OLD#post-21`);
    expect(topicHref(TOPIC, 22)).toBe(`/forum/topics/${TOPIC}?sort=OLD&page=2#post-22`);
  });
});

describe('lastPage', () => {
  it('страниц ответов — без первого сообщения', () => {
    expect(lastPage(1)).toBe(1);
    expect(lastPage(21)).toBe(1);
    expect(lastPage(22)).toBe(2);
  });
});

describe('новость клуба и тренера', () => {
  const news = (kind: 'CLUB' | 'COACH'): ForumSubject => ({
    type: kind === 'CLUB' ? 'CLUB_POST' : 'COACH_POST',
    id: TOPIC,
    name: 'Осенний абонемент',
    slug: null,
    owner: {
      kind,
      id: CLUB,
      slug: kind === 'COACH' ? 'petrov-aleksey' : null,
      name: 'Спин',
      logoUrl: null,
    },
    news: { kind: 'PROMO', imageUrl: null, validUntil: '2026-11-30' },
  });

  it('ведёт на страницу владельца', () => {
    expect(subjectHref(news('CLUB'))).toBe(`/clubs/${CLUB}`);
    expect(subjectHref(news('COACH'))).toBe('/coaches/petrov-aleksey');
  });

  it('узнаётся по типу предмета', () => {
    expect(isNews(news('CLUB'))).toBe(true);
    expect(isNews(null)).toBe(false);
  });
});

describe('forumImageVariant', () => {
  it('вариант ширины — только у фото форума', () => {
    const own = `/api/v1/files/forum/${TOPIC}.webp`;

    expect(forumImageVariant(own, 480)).toBe(`/api/v1/files/forum/${TOPIC}-480.webp`);
    expect(forumImageVariant('https://example.com/a.webp', 480)).toBe('https://example.com/a.webp');
  });
});

describe('тема с предметом «дуэль» (ADR-068)', () => {
  it('ведёт на страницу дуэли и подписана «Дуэль»', () => {
    const id = '00000000-0000-4000-8000-0000000000d1';

    expect(
      subjectHref({
        type: 'DUEL',
        id,
        name: 'Ержанов — Смагулов',
        slug: null,
        owner: null,
        news: null,
      }),
    ).toBe(`/duels/${id}`);
    expect(ru[SUBJECT_KEYS.DUEL]).toBe('Дуэль');
  });
});
