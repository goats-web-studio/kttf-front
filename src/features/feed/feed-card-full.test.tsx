import type {
  FeedForumItem,
  FeedPostItem,
  FeedTopicItem,
  ForumPostView,
  ForumTopicView,
  SiteLocale,
} from '@kttf/shared/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createI18nValue, I18nContext } from '@/common/i18n/context';
import { ru } from '@/common/i18n/ru';
import { useSessionStore } from '@/features/auth/session-store';

import FeedCard from './feed-card';

/**
 * «Показать ещё» в карточке ленты раскрывает запись целиком: первое
 * сообщение темы с разметкой, отметками и ссылками, у новости KTTF — в
 * выбранной версии (ADR-098). «Свернуть» возвращает начало.
 */

const AT = '2026-11-20T10:00:00.000Z';
const TOPIC_ID = '00000000-0000-4000-8000-00000000c101';
const POST_ID = '00000000-0000-4000-8000-00000000c201';
const PLAYER_ID = '00000000-0000-4000-8000-00000000c301';

/** Начало, обрезанное сервером, — с многоточием (`FEED_EXCERPT_MAX`). */
const EXCERPT = 'Сыграли вечером в клубе: восемь человек, круговая…';

/** Полный текст — с абзацами, списком, отметкой и ссылкой. */
const BODY = [
  'Сыграли вечером в клубе: восемь человек, круговая система.',
  '',
  '- первое место — @[Аманбаев Арлан](player:' + PLAYER_ID + ')',
  '- второе — **Ержанов Ерлан**',
  '',
  'Протокол — [по ссылке](https://example.com/protocol).',
].join('\n');

const POST: ForumPostView = {
  id: POST_ID,
  topicId: TOPIC_ID,
  number: 1,
  author: null,
  authoredAs: 'KTTF',
  coauthor: null,
  body: BODY,
  quote: null,
  images: [],
  createdAt: AT,
  editedAt: null,
  deleted: false,
  hidden: false,
  hiddenReason: null,
  likes: 0,
  liked: false,
  mine: false,
  role: null,
};

const TOPIC: ForumTopicView = {
  id: TOPIC_ID,
  section: { id: '00000000-0000-4000-8000-00000000c401', slug: 'kttf', title: 'Новости KTTF' },
  title: 'Вечерний турнир',
  author: null,
  authoredAs: 'KTTF',
  coauthor: null,
  subject: null,
  createdAt: AT,
  postsCount: 1,
  lastPostAt: AT,
  lastAuthorName: 'KTTF',
  pinned: false,
  locked: false,
  hidden: false,
  hiddenReason: null,
  viewsCount: 3,
  unread: null,
  firstUnread: null,
  locale: 'ru',
  translations: [
    {
      locale: 'kk',
      title: 'Кешкі турнир',
      body: 'Кеште клубта ойнадық.\n\n- бірінші орын — **Арлан**',
      image: null,
      images: [],
      updatedAt: AT,
    },
  ],
  firstPost: POST,
  subscribed: false,
  canReply: true,
  canRename: true,
};

const DISCUSSION = {
  topicId: TOPIC_ID,
  postId: POST_ID,
  comments: 0,
  likes: 0,
  views: 3,
  liked: false,
  mine: false,
};

const PORTAL: FeedTopicItem = {
  id: `topic:${TOPIC_ID}`,
  type: 'PORTAL',
  at: AT,
  source: { kind: 'KTTF', id: null, name: 'KTTF', imageUrl: null, slug: null },
  discussion: DISCUSSION,
  pinned: false,
  hidden: false,
  title: 'Вечерний турнир',
  excerpt: EXCERPT,
  images: [],
  archived: false,
  coauthor: null,
  locale: 'ru',
  translations: [{ locale: 'kk', title: 'Кешкі турнир', excerpt: 'Кеште…', image: null, images: [] }],
};

let requests: string[] = [];
/** Ответ темы держится, пока тест не отпустит, — видно состояние загрузки. */
let release: (() => void) | null = null;
let topicReply: () => ForumTopicView | null = () => TOPIC;

function reply(body: unknown): Response {
  return {
    ok: body !== null,
    status: body === null ? 404 : 200,
    text: () =>
      Promise.resolve(
        JSON.stringify(body ?? { statusCode: 404, code: 'NOT_FOUND', message: 'Not found' }),
      ),
  } as unknown as Response;
}

beforeEach(() => {
  requests = [];
  release = null;
  topicReply = () => TOPIC;
  useSessionStore.setState({ user: null, accessToken: null, isRestoring: false });
  vi.stubGlobal('fetch', (input: unknown) => {
    const url = decodeURIComponent(String(input));
    requests.push(url);

    return new Promise<Response>((resolve) => {
      release = () => {
        resolve(reply(topicReply()));
      };
    });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderCard(node: ReactNode, locale: SiteLocale = 'ru'): { unmount: () => void } {
  const root = createRootRoute({
    component: () => <I18nContext value={createI18nValue(locale, ru)}>{node}</I18nContext>,
  });
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

const topicRequests = () => requests.filter((url) => url.endsWith(`/forum/topics/${TOPIC_ID}`));

describe('«Показать ещё» — запись целиком', () => {
  it('до раскрытия темы не спрашивают; начало с многоточием — уже повод для кнопки', async () => {
    renderCard(<FeedCard item={PORTAL} />);

    expect(await screen.findByRole('button', { name: ru['feed.excerpt.more'] })).toBeDefined();
    expect(topicRequests()).toHaveLength(0);
  });

  it('раскрывает первое сообщение темы с разметкой: список, отметка, ссылка', async () => {
    renderCard(<FeedCard item={PORTAL} />);

    const more = await screen.findByRole('button', { name: ru['feed.excerpt.more'] });
    const card = more.closest('article');
    if (card === null) throw new Error('карточка не найдена');
    fireEvent.click(more);

    // Пока тема в пути — кнопка говорит «Загрузка» и не нажимается.
    const loading = await within(card).findByRole<HTMLButtonElement>('button', {
      name: ru['common.loading'],
    });
    expect(loading.disabled).toBe(true);
    expect(topicRequests()).toHaveLength(1);

    release?.();

    const full = await waitFor(() => {
      const node = card.querySelector('[data-feed-excerpt="full"]');
      if (!(node instanceof HTMLElement)) throw new Error('полного текста нет');
      return node;
    });
    expect(full.querySelectorAll('li')).toHaveLength(2);
    expect(within(full).getByRole('link', { name: '@Аманбаев Арлан' }).getAttribute('href')).toBe(
      `/players/${PLAYER_ID}`,
    );
    expect(within(full).getByRole('link', { name: 'по ссылке' }).getAttribute('href')).toBe(
      'https://example.com/protocol',
    );
    // Многоточия начала больше нет — текст целиком.
    expect(full.textContent).toContain('Протокол');
    expect(full.textContent).not.toContain('…');

    fireEvent.click(within(card).getByRole('button', { name: ru['feed.excerpt.less'] }));
    expect(card.querySelector('[data-feed-excerpt="full"]')).toBeNull();
    expect(card.querySelector('[data-feed-excerpt="clamped"]')?.textContent).toBe(EXCERPT);
  });

  it('новость KTTF — в той версии, что выбрана в карточке', async () => {
    renderCard(<FeedCard item={PORTAL} />, 'kk');

    // В карточке на казахском — казахская версия; раскрывается она же.
    const card = (await screen.findByText('Кешкі турнир')).closest('article');
    if (card === null) throw new Error('карточка не найдена');
    fireEvent.click(within(card).getByRole('button', { name: ru['feed.excerpt.more'] }));
    release?.();

    await waitFor(() => {
      expect(card.querySelector('[data-feed-excerpt="full"]')?.textContent).toContain(
        'Кеште клубта ойнадық.',
      );
    });
    expect(card.querySelector('[data-feed-excerpt="full"] li')?.textContent).toContain('Арлан');
  });

  it('тема не ответила — раскрывается начало, как раньше', async () => {
    topicReply = () => null;
    renderCard(<FeedCard item={PORTAL} />);

    fireEvent.click(await screen.findByRole('button', { name: ru['feed.excerpt.more'] }));
    release?.();

    expect(await screen.findByRole('button', { name: ru['feed.excerpt.less'] })).toBeDefined();
    expect(document.querySelector('[data-feed-excerpt="open"]')?.textContent).toBe(EXCERPT);
    expect(document.querySelector('[data-feed-excerpt="full"]')).toBeNull();
  });

  it('новость клуба и тема форума — тоже целиком, из своей темы обсуждения', async () => {
    const post: FeedPostItem = {
      id: 'club-post:00000000-0000-4000-8000-00000000c501',
      type: 'POST',
      kind: 'NEWS',
      at: AT,
      source: { kind: 'CLUB', id: PLAYER_ID, name: 'Клуб', imageUrl: null, slug: null },
      discussion: DISCUSSION,
      pinned: false,
      hidden: false,
      title: 'Новые столы',
      excerpt: EXCERPT,
      imageUrl: null,
      validUntil: null,
    };
    const forum: FeedForumItem = {
      id: `forum:${TOPIC_ID}`,
      type: 'FORUM',
      at: AT,
      source: { kind: 'KTTF', id: null, name: 'Ерлан', imageUrl: null, slug: null },
      discussion: DISCUSSION,
      pinned: false,
      hidden: false,
      section: { slug: 'equipment', title: 'Инвентарь' },
      title: 'Какую накладку взять?',
      excerpt: EXCERPT,
      isNew: true,
    };

    for (const item of [post, forum]) {
      requests = [];
      const { unmount } = renderCard(<FeedCard item={item} />);
      fireEvent.click(await screen.findByRole('button', { name: ru['feed.excerpt.more'] }));
      release?.();
      await waitFor(() => {
        expect(document.querySelector('[data-feed-excerpt="full"] li')).not.toBeNull();
      });
      expect(topicRequests()).toHaveLength(1);
      unmount();
    }
  });

  it('без темы обсуждения — раскрывается начало, лишних запросов нет', async () => {
    renderCard(<FeedCard item={{ ...PORTAL, discussion: null }} />);

    fireEvent.click(await screen.findByRole('button', { name: ru['feed.excerpt.more'] }));

    expect(document.querySelector('[data-feed-excerpt="open"]')?.textContent).toBe(EXCERPT);
    expect(topicRequests()).toHaveLength(0);
  });
});
