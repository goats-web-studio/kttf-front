import type {
  AuthUserView,
  FeedForumItem,
  FeedItem,
  FeedPage,
  FeedPostItem,
} from '@kttf/shared/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { ru } from '@/common/i18n/ru';
import { useSessionStore } from '@/features/auth/session-store';
import { topicHref } from '@/features/forum/labels';
import { NAV_MENUS } from '@/features/shell/nav-menus';
import { CLUB, pageOf, placesReply, PLAYERS, USER_WITH_PROFILE } from '@/test/fixtures';

/**
 * Страница «Лента» — ADR-097: вкладки и фильтр в адресе и в запросе,
 * карточка темы форума, «Показать ещё», вход в ленту из навигации.
 */

const AT = '2026-11-18T10:00:00.000Z';

const CLUB_POST: FeedPostItem = {
  id: 'club-post:00000000-0000-4000-8000-00000000f001',
  type: 'POST',
  kind: 'NEWS',
  at: AT,
  source: { kind: 'CLUB', id: CLUB.id, name: CLUB.name, imageUrl: null, slug: null },
  discussion: null,
  pinned: false,
  hidden: false,
  title: 'Новые столы в зале',
  excerpt: 'Поставили два стола Butterfly.',
  imageUrl: null,
  validUntil: null,
};

const TOPIC_ID = '00000000-0000-4000-8000-00000000f101';

const FORUM_ITEM: FeedForumItem = {
  id: `forum:${TOPIC_ID}`,
  type: 'FORUM',
  at: AT,
  source: { kind: 'KTTF', id: null, name: 'Ерлан', imageUrl: null, slug: null },
  discussion: { topicId: TOPIC_ID, postId: null, comments: 7, likes: 2, views: 40 },
  pinned: false,
  hidden: false,
  section: { slug: 'equipment', title: 'Инвентарь' },
  title: 'Какую накладку взять на форхенд?',
  excerpt: 'Играю третий год, хочу быстрее.',
  isNew: true,
};

function post(index: number): FeedPostItem {
  return {
    ...CLUB_POST,
    id: `club-post:00000000-0000-4000-8000-0000000f${String(index).padStart(4, '0')}`,
    title: `Новость клуба №${String(index)}`,
  };
}

/** Ответ ленты по адресу запроса: фильтр и страница — из строки запроса. */
let feedReply: (params: URLSearchParams) => FeedPage;

function defaultFeed(params: URLSearchParams): FeedPage {
  const filter = params.get('filter');
  const items: FeedItem[] =
    filter === 'FORUM' ? [FORUM_ITEM] : filter === 'CLUBS' ? [CLUB_POST] : [CLUB_POST, FORUM_ITEM];

  return {
    tab: (params.get('tab') ?? 'ALL') as FeedPage['tab'],
    filter: (filter ?? null) as FeedPage['filter'],
    items,
    total: items.length,
    page: Number(params.get('page') ?? 1),
    limit: Number(params.get('limit') ?? 8),
  };
}

function reply(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function answer(url: string): Response {
  const places = placesReply(url);
  if (places !== undefined) return reply(places);

  const { pathname, searchParams } = new URL(url, 'http://localhost');
  if (pathname.endsWith('/feed')) return reply(feedReply(searchParams));
  if (pathname.includes('/follows')) return reply([]);
  if (pathname.endsWith('/forum/sections')) return reply([]);
  if (pathname.includes('/notifications')) return reply({ items: [], unread: 0 });
  // Шапка вошедшего — его профиль игрока.
  if (pathname.endsWith(`/players/${String(USER_WITH_PROFILE.playerId)}`))
    return reply(PLAYERS.first);

  // Ближайшие турниры, справочник клубов и прочее — пусто.
  return reply(pageOf([]));
}

let requests: string[] = [];

beforeEach(() => {
  requests = [];
  feedReply = defaultFeed;
  useSessionStore.setState({ user: null, accessToken: null, isRestoring: false });
  vi.stubGlobal('fetch', (input: unknown) => {
    requests.push(decodeURIComponent(String(input)));
    return Promise.resolve(answer(String(input)));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderAt(path: string, session: AuthUserView | null = null): void {
  if (session !== null) {
    useSessionStore.setState({ user: session, accessToken: 'access-1', isRestoring: false });
  }
  window.history.pushState({}, '', path);

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter({ queryClient, session });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

/** Ширина экрана для `useMediaQuery`: в jsdom `matchMedia` нет, и без неё — телефон. */
function asDesktop(): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('min-width'),
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }));
}

const feedRequests = () => requests.filter((url) => url.includes('/feed?'));

describe('страница «Лента» — ADR-097', () => {
  it('гостю — фильтры чипами, без вкладок; запрос «Все» без фильтра', async () => {
    renderAt('/feed');

    expect(await screen.findByRole('heading', { level: 1, name: ru['feed.title'] })).toBeDefined();
    const filters = screen.getByRole('navigation', { name: ru['feed.filter.title'] });
    for (const key of [
      'feed.filter.all',
      'feed.filter.KTTF',
      'feed.filter.CLUBS',
      'feed.filter.COACHES',
      'feed.filter.PLAYERS',
      'feed.filter.TOURNAMENTS',
      'feed.filter.FORUM',
    ] as const) {
      expect(within(filters).getByRole('link', { name: ru[key] })).toBeDefined();
    }
    expect(screen.queryByRole('radiogroup', { name: ru['feed.tabs'] })).toBeNull();
    expect(screen.getByRole('link', { name: ru['feed.guest.action'] }).getAttribute('href')).toBe(
      '/login',
    );
    expect(await screen.findByText(CLUB_POST.title)).toBeDefined();

    const [first] = feedRequests();
    expect(first).toContain('tab=ALL');
    expect(first).not.toContain('filter=');
  });

  it('выбор фильтра меняет адрес и запрос', async () => {
    renderAt('/feed');

    const filters = await screen.findByRole('navigation', { name: ru['feed.filter.title'] });
    fireEvent.click(within(filters).getByRole('link', { name: ru['feed.filter.CLUBS'] }));

    await waitFor(() => {
      expect(window.location.search).toBe('?filter=CLUBS');
    });
    await waitFor(() => {
      expect(feedRequests().some((url) => url.includes('filter=CLUBS'))).toBe(true);
    });
    expect(
      within(filters)
        .getByRole('link', { name: ru['feed.filter.CLUBS'] })
        .getAttribute('aria-current'),
    ).toBe('page');
  });

  it('фильтр из адреса — пусто: своя подпись и «Показать всё»', async () => {
    feedReply = (params) => ({ ...defaultFeed(params), items: [], total: 0 });
    renderAt('/feed?filter=COACHES');

    expect(await screen.findByText(ru['feed.empty.COACHES'])).toBeDefined();
    expect(screen.getByRole('link', { name: ru['feed.filter.reset'] }).getAttribute('href')).toBe(
      '/feed',
    );
    expect(feedRequests().every((url) => url.includes('filter=COACHES'))).toBe(true);
  });

  it('тема форума: раздел ссылкой, метка «Новая тема», заголовок ведёт в тему', async () => {
    renderAt('/feed?filter=FORUM');

    const title = await screen.findByRole('link', { name: FORUM_ITEM.title });
    expect(title.getAttribute('href')).toBe(topicHref(TOPIC_ID));
    const card = title.closest('article');
    if (card === null) throw new Error('карточка темы не найдена');

    expect(card.getAttribute('data-feed-item')).toBe('FORUM');
    expect(
      within(card).getByRole('link', { name: FORUM_ITEM.section.title }).getAttribute('href'),
    ).toBe('/forum/equipment');
    expect(within(card).getByText(ru['feed.forum.new'])).toBeDefined();
    expect(within(card).getByText(FORUM_ITEM.excerpt)).toBeDefined();
    // Счётчики обсуждения — как у остальных карточек.
    expect(within(card).getByTitle(ru['feed.comments']).textContent).toBe('7');
  });

  it('«Показать ещё» загружает вторую страницу', async () => {
    feedReply = (params) => {
      const page = Number(params.get('page') ?? 1);
      const items = page === 1 ? [1, 2, 3, 4, 5, 6, 7, 8].map(post) : [post(9)];
      return { ...defaultFeed(params), items, total: 9, page, limit: 8 };
    };
    renderAt('/feed');

    expect(await screen.findByText('Новость клуба №8')).toBeDefined();
    expect(screen.queryByText('Новость клуба №9')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: ru['feed.more'] }));

    expect(await screen.findByText('Новость клуба №9')).toBeDefined();
    expect(feedRequests().some((url) => url.includes('page=2'))).toBe(true);
    expect(screen.queryByRole('button', { name: ru['feed.more'] })).toBeNull();
  });

  it('вошедшему — вкладки; «Подписки» меняет адрес и запрос', async () => {
    renderAt('/feed', USER_WITH_PROFILE);

    const tabs = await screen.findByRole('radiogroup', { name: ru['feed.tabs'] });
    await waitFor(() => {
      expect(feedRequests().some((url) => url.includes('tab=FOR_YOU'))).toBe(true);
    });
    expect(screen.queryByRole('link', { name: ru['feed.guest.action'] })).toBeNull();

    fireEvent.click(within(tabs).getByRole('radio', { name: ru['feed.tab.following'] }));

    await waitFor(() => {
      expect(window.location.search).toBe('?tab=FOLLOWING');
    });
    await waitFor(() => {
      expect(feedRequests().some((url) => url.includes('tab=FOLLOWING'))).toBe(true);
    });
  });

  it('на компьютере — фильтры столбиком слева и «Обсуждают на форуме» справа', async () => {
    asDesktop();
    renderAt('/feed');

    const side = await screen.findByRole('navigation', { name: ru['feed.title'] });
    expect(
      within(side).getByRole('link', { name: ru['feed.filter.FORUM'] }).getAttribute('href'),
    ).toBe('/feed?filter=FORUM');
    expect(
      within(side).getByRole('link', { name: ru['feed.filter.all'] }).getAttribute('aria-current'),
    ).toBe('page');

    const hot = await screen.findByText(ru['feed.hot.title']);
    const block = hot.closest('section');
    if (block === null) throw new Error('блок форума не найден');
    expect(within(block).getByRole('link', { name: FORUM_ITEM.title }).getAttribute('href')).toBe(
      topicHref(TOPIC_ID),
    );
    expect(
      feedRequests().some((url) => url.includes('filter=FORUM') && url.includes('limit=5')),
    ).toBe(true);
  });
});

describe('вход в ленту из навигации — ADR-097', () => {
  it('«Лента» — первый пункт меню «Сообщество»', () => {
    expect(NAV_MENUS['/forum']?.[0]?.href).toBe('/feed');
  });

  it('на телефоне «Сообщество» открывает лист с «Лентой»', async () => {
    renderAt('/feed');

    // Шапка и нижняя панель — обе «Разделы сайта»; кнопка листа — только в панели.
    await screen.findAllByRole('navigation', { name: ru['nav.sections'] });
    const community = screen.getByRole('button', { name: ru['nav.community'] });
    // Лента — часть сообщества: пункт подсвечен.
    expect(community.getAttribute('aria-current')).toBe('page');

    fireEvent.click(community);

    const sheet = await screen.findByRole('dialog', { name: ru['nav.community'] });
    expect(
      within(sheet)
        .getByRole('link', { name: ru['nav.menu.forum.feed.title'] })
        .getAttribute('href'),
    ).toBe('/feed');
    expect(
      within(sheet).getByRole('link', { name: ru['nav.menu.players.duels.title'] }),
    ).toBeDefined();
  });
});
