import type {
  AuthUserView,
  ForumAuthor,
  ForumPostView,
  ForumSectionView,
  ForumTopicView,
} from '@kttf/shared/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { fill } from '@/common/i18n';
import { ru } from '@/common/i18n/ru';
import { useSessionStore } from '@/features/auth/session-store';
import { pageOf, placesReply, PLAYERS, USER_WITH_PROFILE } from '@/test/fixtures';

/**
 * Форум — правки по замечаниям владельца: «Новая тема» окном прямо на
 * форуме, «нравится» работает (сразу, с откатом при отказе), своё — не
 * отметить, рейтинг у автора — только когда сервер его прислал, фото
 * сообщения открывается поверх страницы.
 */

const AT = '2026-11-18T10:00:00.000Z';
const TOPIC_ID = '00000000-0000-4000-8000-00000000c001';
const NEW_TOPIC_ID = '00000000-0000-4000-8000-00000000c009';
const FIRST_POST = '00000000-0000-4000-8000-00000000c101';
const REPLY_POST = '00000000-0000-4000-8000-00000000c102';

function section(id: string, slug: string, title: string): ForumSectionView {
  return {
    id,
    slug,
    title,
    description: null,
    position: 1,
    subjectTypes: [],
    manualTopics: true,
    archived: false,
    topicsCount: 0,
    postsCount: 0,
    last: null,
  };
}

const SECTIONS: ForumSectionView[] = [
  section('00000000-0000-4000-8000-00000000a001', 'general', 'Общение'),
  section('00000000-0000-4000-8000-00000000a002', 'equipment', 'Инвентарь'),
];

/** Автор с неподтверждённой анкетой: сервер не прислал рейтинг. */
const UNRATED: ForumAuthor = {
  userId: '00000000-0000-4000-8000-00000000b001',
  playerId: '00000000-0000-4000-8000-00000000b011',
  name: 'Аманбаев Арлан',
  photoUrl: null,
  rating: null,
  club: null,
  moderator: true,
  coachSlug: null,
  online: false,
};

const RATED: ForumAuthor = {
  ...UNRATED,
  userId: '00000000-0000-4000-8000-00000000b002',
  playerId: '00000000-0000-4000-8000-00000000b012',
  name: 'Ким Ерлан',
  rating: 512,
  moderator: false,
};

function postView(patch: Partial<ForumPostView>): ForumPostView {
  return {
    id: FIRST_POST,
    topicId: TOPIC_ID,
    number: 1,
    author: UNRATED,
    body: 'Какую накладку взять на форхенд?',
    quote: null,
    images: [],
    createdAt: AT,
    editedAt: null,
    deleted: false,
    hidden: false,
    hiddenReason: null,
    likes: 2,
    liked: false,
    mine: false,
    role: null,
    ...patch,
  };
}

let firstPost: ForumPostView;
let replyPost: ForumPostView;

function topicView(): ForumTopicView {
  return {
    id: TOPIC_ID,
    section: { id: SECTIONS[1]?.id ?? '', slug: 'equipment', title: 'Инвентарь' },
    title: 'Накладка на форхенд',
    author: UNRATED,
    subject: null,
    createdAt: AT,
    postsCount: 2,
    lastPostAt: AT,
    lastAuthorName: RATED.name,
    pinned: false,
    locked: false,
    hidden: false,
    hiddenReason: null,
    viewsCount: 10,
    unread: null,
    firstUnread: null,
    firstPost,
    subscribed: false,
    canReply: true,
    canRename: false,
  };
}

interface Call {
  readonly url: string;
  readonly method: string;
  readonly body: unknown;
}

let calls: Call[] = [];
/** Ответ на «нравится»: по умолчанию — как просили. */
let likeReply: (url: string, method: string) => Response;

function reply(body: unknown, status = 200): Response {
  return {
    ok: status < 400,
    status,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
  } as unknown as Response;
}

function answer(url: string, method: string): Response {
  const places = placesReply(url);
  if (places !== undefined) return reply(places);

  const { pathname } = new URL(url, 'http://localhost');

  if (pathname.endsWith('/like')) return likeReply(url, method);
  if (pathname.endsWith('/forum/sections')) return reply(SECTIONS);
  if (pathname.endsWith('/forum/me'))
    return reply({ canPost: true, profileRequired: false, mute: null, moderator: false });
  if (pathname.endsWith('/forum/online')) return reply({ players: 0 });
  if (pathname.endsWith('/forum/birthdays')) return reply([]);
  if (pathname.endsWith('/forum/topics') && method === 'POST')
    return reply({ ...topicView(), id: NEW_TOPIC_ID, title: 'Новая тема про мячи' });
  if (pathname.endsWith(`/forum/topics/${TOPIC_ID}/posts`)) return reply(pageOf([replyPost]));
  if (pathname.endsWith(`/forum/topics/${TOPIC_ID}`)) return reply(topicView());
  if (pathname.endsWith(`/forum/topics/${NEW_TOPIC_ID}/posts`)) return reply(pageOf([]));
  if (pathname.endsWith(`/forum/topics/${NEW_TOPIC_ID}`))
    return reply({ ...topicView(), id: NEW_TOPIC_ID, title: 'Новая тема про мячи', postsCount: 1 });
  if (pathname.includes('/notifications')) return reply({ items: [], unread: 0 });
  if (pathname.endsWith(`/players/${String(USER_WITH_PROFILE.playerId)}`))
    return reply(PLAYERS.first);

  return reply(pageOf([]));
}

beforeEach(() => {
  calls = [];
  firstPost = postView({});
  replyPost = postView({
    id: REPLY_POST,
    number: 2,
    author: RATED,
    body: 'Попробуй Tenergy.',
    likes: 5,
  });
  likeReply = (url, method) => {
    const liked = method === 'PUT';
    const base = url.includes(FIRST_POST) ? firstPost.likes : replyPost.likes;

    return reply({ likes: base + (liked ? 1 : 0), liked });
  };
  useSessionStore.setState({ user: null, accessToken: null, isRestoring: false });
  vi.stubGlobal('fetch', (input: unknown, init?: { method?: string; body?: string }) => {
    const url = decodeURIComponent(String(input));
    const method = init?.method ?? 'GET';
    calls.push({
      url,
      method,
      body: typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined,
    });
    return Promise.resolve(answer(url, method));
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

const likeLabel = (count: number, liked = false): string =>
  fill(ru[liked ? 'forum.action.unlike' : 'forum.action.like'], { count: String(count) });

describe('«Новая тема» — окном прямо на форуме', () => {
  it('на форуме кнопка открывает форму окном, без перехода на /forum/new', async () => {
    renderAt('/forum', USER_WITH_PROFILE);

    const [button] = await screen.findAllByRole('button', { name: ru['forum.newTopic'] });
    if (button === undefined) throw new Error('кнопки «Новая тема» нет');
    expect(button.getAttribute('href')).toBeNull();

    fireEvent.click(button);

    const dialog = await screen.findByRole('dialog', { name: ru['forum.newTopic'] });
    expect(window.location.pathname).toBe('/forum');
    expect(
      await within(dialog).findByRole('textbox', { name: ru['forum.new.titleLabel'] }),
    ).toBeDefined();
  });

  it('в разделе — раздел выбран; создали тему — переход в неё', async () => {
    renderAt('/forum/equipment', USER_WITH_PROFILE);

    const [button] = await screen.findAllByRole('button', { name: ru['forum.newTopic'] });
    if (button === undefined) throw new Error('кнопки «Новая тема» нет');
    fireEvent.click(button);

    const dialog = await screen.findByRole('dialog', { name: ru['forum.newTopic'] });
    await waitFor(() => {
      expect(within(dialog).getByRole('combobox').textContent).toBe('Инвентарь');
    });

    fireEvent.change(
      within(dialog).getByRole<HTMLInputElement>('textbox', { name: ru['forum.new.titleLabel'] }),
      { target: { value: 'Новая тема про мячи' } },
    );
    fireEvent.change(
      within(dialog).getByRole<HTMLTextAreaElement>('textbox', {
        name: ru['forum.composer.placeholder'],
      }),
      { target: { value: 'Какие мячи берёте на тренировки?' } },
    );
    fireEvent.click(within(dialog).getByRole('button', { name: ru['forum.new.submit'] }));

    await waitFor(() => {
      expect(window.location.pathname).toBe(`/forum/topics/${NEW_TOPIC_ID}`);
    });
    const created = calls.find((call) => call.method === 'POST' && call.url.endsWith('/topics'));
    expect(created?.body).toMatchObject({
      sectionId: SECTIONS[1]?.id,
      title: 'Новая тема про мячи',
      body: 'Какие мячи берёте на тренировки?',
    });
  });

  it('гостю окно предлагает войти, а не показывает форму', async () => {
    renderAt('/forum');

    const [button] = await screen.findAllByRole('button', { name: ru['forum.newTopic'] });
    if (button === undefined) throw new Error('кнопки «Новая тема» нет');
    fireEvent.click(button);

    const dialog = await screen.findByRole('dialog', { name: ru['forum.newTopic'] });
    expect(within(dialog).getByText(ru['forum.gate.login'])).toBeDefined();
    expect(within(dialog).queryByRole('textbox', { name: ru['forum.new.titleLabel'] })).toBeNull();
  });

  it('страница /forum/new по прямой ссылке работает, раздел — из адреса', async () => {
    renderAt('/forum/new?section=equipment', USER_WITH_PROFILE);

    expect(
      await screen.findByRole('heading', { level: 1, name: ru['forum.newTopic'] }),
    ).toBeDefined();
    await waitFor(() => {
      expect(screen.getByRole('combobox').textContent).toBe('Инвентарь');
    });
  });
});

describe('«Нравится» у сообщений темы', () => {
  it('нажатие сразу красит и считает, запрос — PUT; повторное — снимает', async () => {
    renderAt(`/forum/topics/${TOPIC_ID}`, USER_WITH_PROFILE);

    const like = await screen.findByRole('button', { name: likeLabel(2) });
    expect(like.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(like);

    // Сразу, не дожидаясь ответа.
    expect(screen.getByRole('button', { name: likeLabel(3, true) })).toBeDefined();
    await waitFor(() => {
      expect(calls.some((call) => call.method === 'PUT' && call.url.includes(FIRST_POST))).toBe(
        true,
      );
    });

    const unlike = await screen.findByRole('button', { name: likeLabel(3, true) });
    expect(unlike.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(unlike);

    expect(await screen.findByRole('button', { name: likeLabel(2) })).toBeDefined();
    await waitFor(() => {
      expect(calls.some((call) => call.method === 'DELETE' && call.url.includes(FIRST_POST))).toBe(
        true,
      );
    });
  });

  it('отказ сервера возвращает как было и объясняет', async () => {
    likeReply = () =>
      reply(
        { error: { code: 'FORUM_PROFILE_REQUIRED', message: 'Forum requires a player profile' } },
        403,
      );
    renderAt(`/forum/topics/${TOPIC_ID}`, USER_WITH_PROFILE);

    fireEvent.click(await screen.findByRole('button', { name: likeLabel(2) }));

    expect(await screen.findByText(ru['error.api.FORUM_PROFILE_REQUIRED'])).toBeDefined();
    expect(screen.getByRole('button', { name: likeLabel(2) }).getAttribute('aria-pressed')).toBe(
      'false',
    );
  });

  it('своё сообщение не отметить: кнопка выключена, подсказка объясняет', async () => {
    firstPost = postView({ mine: true });
    renderAt(`/forum/topics/${TOPIC_ID}`, USER_WITH_PROFILE);

    const own = await screen.findByRole('button', { name: likeLabel(2) });
    expect((own as HTMLButtonElement).disabled).toBe(true);
    expect(own.closest('[data-forum-like-own]')).not.toBeNull();
  });

  it('гостю сердце ведёт на вход и обратно в тему', async () => {
    renderAt(`/forum/topics/${TOPIC_ID}`);

    const like = await screen.findByRole('link', { name: likeLabel(2) });
    expect(like.getAttribute('href')).toBe(
      `/login?redirect=${encodeURIComponent(`/forum/topics/${TOPIC_ID}`)}`,
    );
  });
});

describe('автор сообщения', () => {
  it('рейтинг — только когда сервер его прислал: у неподтверждённой анкеты его нет', async () => {
    renderAt(`/forum/topics/${TOPIC_ID}`);

    const article = (await screen.findByText(firstPost.body)).closest('article');
    const reply = (await screen.findByText(replyPost.body)).closest('article');
    if (article === null || reply === null) throw new Error('сообщения не найдены');

    expect(within(article).getByRole('link', { name: UNRATED.name })).toBeDefined();
    expect(within(article).queryByText(/250/)).toBeNull();
    expect(within(reply).getByText(/512/)).toBeDefined();
  });
});

describe('фото сообщения', () => {
  it('нажатие открывает фото поверх страницы, а не в новой вкладке', async () => {
    firstPost = postView({
      images: [
        { url: '/files/forum/a.webp', width: 1200, height: 800 },
        { url: '/files/forum/b.webp', width: 1200, height: 800 },
      ],
    });
    renderAt(`/forum/topics/${TOPIC_ID}`);

    const [first] = await screen.findAllByRole('button', {
      name: `${ru['feed.image.open']} 1 / 2`,
    });
    if (first === undefined) throw new Error('фото не найдено');
    fireEvent.click(first);

    const viewer = await screen.findByRole('dialog', { name: ru['feed.image.open'] });
    expect(viewer.querySelector('img')?.getAttribute('src')).toBe('/files/forum/a.webp');

    fireEvent.click(within(viewer).getByRole('button', { name: ru['club.gallery.next'] }));
    await waitFor(() => {
      expect(viewer.querySelector('img')?.getAttribute('src')).toBe('/files/forum/b.webp');
    });
  });
});
