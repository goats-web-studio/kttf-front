import type {
  FeedTopicItem,
  ForumAuthor,
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
import FeedCard from '@/features/feed/feed-card';
import { USER_WITH_PROFILE } from '@/test/fixtures';

import Composer from './composer';
import { pickNewsLocale } from './news-locale';
import { NewsVersionsEditor } from './news-versions';
import PostCard from './post-card';
import PostAuthor from './voice';

/**
 * Новости KTTF — ADR-098: шапка «от себя / от KTTF / с соавтором», выбор
 * голоса у модератора, версия новости по языку интерфейса и «Перевод»,
 * редактор версий по вкладкам.
 */

const PLAYER_ID = '00000000-0000-4000-8000-00000000a001';
const TOPIC_ID = '00000000-0000-4000-8000-00000000a101';
const POST_ID = '00000000-0000-4000-8000-00000000a201';
const AT = '2026-11-20T10:00:00.000Z';
const COVER = {
  url: '/api/v1/files/forum/00000000-0000-4000-8000-00000000a301.webp',
  width: 1600,
  height: 900,
};

const AUTHOR: ForumAuthor = {
  userId: '00000000-0000-4000-8000-00000000a401',
  playerId: PLAYER_ID,
  name: 'Аманбаев Арлан',
  photoUrl: null,
  rating: 250,
  club: null,
  moderator: true,
  coachSlug: null,
  online: false,
};

const POST: ForumPostView = {
  id: POST_ID,
  topicId: TOPIC_ID,
  number: 1,
  author: null,
  authoredAs: 'KTTF',
  coauthor: null,
  body: 'Платформа открыта для всех клубов.',
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
  section: { id: '00000000-0000-4000-8000-00000000a501', slug: 'kttf', title: 'Новости KTTF' },
  title: 'KTTF открыт',
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
  translations: [{ locale: 'kk', title: 'KTTF ашылды', body: 'Мәтін', image: null, updatedAt: AT }],
  firstPost: POST,
  subscribed: false,
  canReply: true,
  canRename: true,
};

const PORTAL: FeedTopicItem = {
  id: `topic:${TOPIC_ID}`,
  type: 'PORTAL',
  at: AT,
  source: { kind: 'KTTF', id: null, name: 'KTTF', imageUrl: null, slug: null },
  discussion: { topicId: TOPIC_ID, postId: POST_ID, comments: 0, likes: 0, views: 3 },
  pinned: false,
  hidden: false,
  title: 'KTTF открыт',
  excerpt: 'Платформа открыта для всех клубов.',
  images: [],
  archived: false,
  coauthor: { playerId: PLAYER_ID, name: 'Аманбаев Арлан', photoUrl: null },
  locale: 'ru',
  translations: [
    {
      locale: 'kk',
      title: 'KTTF ашылды',
      excerpt: 'Платформа барлық клубтарға ашық.',
      image: COVER,
    },
    { locale: 'en', title: 'KTTF is open', excerpt: 'The platform is open.', image: null },
  ],
};

let requests: { method: string; url: string; body: unknown }[] = [];

function reply(body: unknown): Response {
  return {
    ok: true,
    status: body === undefined ? 204 : 200,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
  } as unknown as Response;
}

beforeEach(() => {
  requests = [];
  useSessionStore.setState({ user: null, accessToken: null, isRestoring: false });
  vi.stubGlobal('fetch', (input: unknown, init?: RequestInit) => {
    const url = decodeURIComponent(String(input));
    const method = init?.method ?? 'GET';
    requests.push({
      method,
      url,
      body: typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined,
    });
    if (method === 'DELETE') return Promise.resolve(reply(undefined));
    if (url.includes('/forum/me')) {
      return Promise.resolve(
        reply({ canPost: true, profileRequired: false, mute: null, moderator: true }),
      );
    }
    return Promise.resolve(reply(TOPIC));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderUi(node: ReactNode, locale: SiteLocale = 'ru'): void {
  const root = createRootRoute({
    component: () => <I18nContext value={createI18nValue(locale, ru)}>{node}</I18nContext>,
  });
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

function asModerator(): void {
  useSessionStore.setState({
    user: { ...USER_WITH_PROFILE, isAdmin: true },
    accessToken: 'access-1',
    isRestoring: false,
  });
}

describe('шапка сообщения по голосу', () => {
  it('от себя — профиль игрока ссылкой и рейтинг, без знака KTTF', async () => {
    renderUi(<PostAuthor authoredAs="SELF" author={AUTHOR} coauthor={null} />);

    const name = await screen.findByRole('link', { name: 'Аманбаев Арлан' });
    expect(name.getAttribute('href')).toBe(`/players/${PLAYER_ID}`);
    expect(screen.queryByText(ru['forum.voice.official'])).toBeNull();
  });

  it('от KTTF — знак, «KTTF» и «Официально», человека нет', async () => {
    renderUi(<PostAuthor authoredAs="KTTF" author={null} coauthor={null} />);

    expect(await screen.findByText(ru['forum.voice.official'])).toBeDefined();
    expect(screen.getAllByText('KTTF').length).toBeGreaterThan(0);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByText(/Аманбаев/)).toBeNull();
  });

  it('с соавтором — строка «Соавтор:» ссылкой на профиль', async () => {
    renderUi(
      <PostAuthor
        authoredAs="KTTF_WITH_COAUTHOR"
        author={null}
        coauthor={{ playerId: PLAYER_ID, name: 'Аманбаев Арлан', photoUrl: null }}
      />,
    );

    const line = await screen.findByText(ru['forum.voice.coauthor'], { exact: false });
    const link = within(line).getByRole('link', { name: 'Аманбаев Арлан' });
    expect(link.getAttribute('href')).toBe(`/players/${PLAYER_ID}`);
    expect(screen.getByText(ru['forum.voice.official'])).toBeDefined();
  });

  it('модератору — «Написал: …» под знаком', async () => {
    renderUi(<PostAuthor authoredAs="KTTF" author={AUTHOR} coauthor={null} />);

    expect(
      await screen.findByText(ru['forum.voice.writtenBy'].replace('{name}', 'Аманбаев Арлан')),
    ).toBeDefined();
  });
});

describe('выбор голоса в поле сообщения', () => {
  it('без права — выбора нет и режим не отправляется', async () => {
    const submit = vi.fn(() => Promise.resolve());
    renderUi(<Composer submit={submit} />);

    const field = await screen.findByRole<HTMLTextAreaElement>('textbox');
    expect(screen.queryByRole('radiogroup', { name: ru['forum.voice.label'] })).toBeNull();
    fireEvent.change(field, { target: { value: 'Привет' } });
    fireEvent.click(screen.getByRole('button', { name: ru['forum.composer.send'] }));

    await waitFor(() => {
      expect(submit).toHaveBeenCalledWith({ body: 'Привет' });
    });
  });

  it('модератор переключает «От себя» → «KTTF и соавтор», режим уходит с сообщением', async () => {
    const submit = vi.fn(() => Promise.resolve());
    renderUi(<Composer submit={submit} voices />);

    const group = await screen.findByRole('radiogroup', { name: ru['forum.voice.label'] });
    expect(
      within(group)
        .getByRole('radio', { name: ru['forum.voice.SELF'] })
        .getAttribute('aria-checked'),
    ).toBe('true');
    fireEvent.click(
      within(group).getByRole('radio', { name: ru['forum.voice.KTTF_WITH_COAUTHOR'] }),
    );
    expect(screen.getByText(ru['forum.voice.hintCoauthor'])).toBeDefined();

    fireEvent.change(screen.getByRole<HTMLTextAreaElement>('textbox'), {
      target: { value: 'Ответ' },
    });
    fireEvent.click(screen.getByRole('button', { name: ru['forum.composer.send'] }));

    await waitFor(() => {
      expect(submit).toHaveBeenCalledWith({ body: 'Ответ', authoredAs: 'KTTF_WITH_COAUTHOR' });
    });
  });

  it('по умолчанию у новости — от KTTF', async () => {
    renderUi(<Composer submit={() => Promise.resolve()} voices defaultVoice="KTTF" />);

    const group = await screen.findByRole('radiogroup', { name: ru['forum.voice.label'] });
    expect(
      within(group)
        .getByRole('radio', { name: ru['forum.voice.KTTF'] })
        .getAttribute('aria-checked'),
    ).toBe('true');
  });
});

describe('сообщение KTTF в теме', () => {
  it('гость видит знак; модератор может править чужое сообщение KTTF', async () => {
    asModerator();
    renderUi(<PostCard post={{ ...POST, author: AUTHOR }} canReply article />);

    expect(await screen.findByText(ru['forum.voice.official'])).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: ru['forum.action.more'] }));
    fireEvent.click(await screen.findByRole('menuitem', { name: ru['forum.action.edit'] }));

    const group = await screen.findByRole('radiogroup', { name: ru['forum.voice.label'] });
    fireEvent.click(within(group).getByRole('radio', { name: ru['forum.voice.SELF'] }));
    fireEvent.click(screen.getByRole('button', { name: ru['forum.action.save'] }));

    await waitFor(() => {
      expect(requests.find((row) => row.method === 'PATCH')).toMatchObject({
        url: expect.stringContaining(`/forum/posts/${POST_ID}`) as unknown,
        body: { body: POST.body, images: [], authoredAs: 'SELF' },
      });
    });
  });

  it('версия новости показывается вместо текста оригинала', async () => {
    renderUi(
      <PostCard post={POST} canReply={false} article version={{ body: 'Мәтін', images: [] }} />,
    );

    expect(await screen.findByText('Мәтін')).toBeDefined();
    expect(screen.queryByText(POST.body)).toBeNull();
  });
});

describe('версия новости по языку', () => {
  it('язык интерфейса, если версия есть, иначе оригинал', () => {
    expect(pickNewsLocale('ru', ['kk', 'en'], 'kk')).toBe('kk');
    expect(pickNewsLocale('ru', ['kk'], 'ja')).toBe('ru');
    expect(pickNewsLocale('ru', ['kk'], 'ru')).toBe('ru');
    expect(pickNewsLocale(null, [], 'kk')).toBeNull();
  });

  it('карточка новости на казахском — казахская версия с её обложкой; «Перевод» — к оригиналу', async () => {
    renderUi(<FeedCard item={PORTAL} />, 'kk');

    expect(await screen.findByRole('heading', { name: 'KTTF ашылды' })).toBeDefined();
    const card = screen.getByRole('article');
    expect(card.querySelector('img')?.getAttribute('src')).toContain('00000000a301');
    expect(screen.getByText(ru['forum.voice.coauthor'], { exact: false })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Қазақша' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Оригинал (Русский)' }));

    expect(await screen.findByRole('heading', { name: 'KTTF открыт' })).toBeDefined();
    expect(screen.getByText(PORTAL.excerpt)).toBeDefined();
  });

  it('на русском — оригинал; «Перевод» открывает английскую версию', async () => {
    renderUi(<FeedCard item={PORTAL} />, 'ru');

    expect(await screen.findByRole('heading', { name: 'KTTF открыт' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: ru['news.lang.switch'] }));
    const menu = await screen.findByRole('menu');
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(['Оригинал (Русский)', 'Қазақша', 'English']);
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'English' }));

    expect(await screen.findByRole('heading', { name: 'KTTF is open' })).toBeDefined();
  });

  it('у записи игрока переключателя нет', async () => {
    renderUi(
      <FeedCard
        item={{ ...PORTAL, type: 'PLAYER_POST', locale: null, translations: [], coauthor: null }}
      />,
    );

    await screen.findByText(PORTAL.excerpt);
    expect(screen.queryByRole('button', { name: ru['news.lang.switch'] })).toBeNull();
  });
});

describe('редактор версий новости', () => {
  it('вкладки по языкам, «Добавить язык» и сохранение версии', async () => {
    asModerator();
    renderUi(<NewsVersionsEditor topic={TOPIC} />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: ru['news.versions.open'].replace('{count}', '2'),
      }),
    );
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog)
        .getAllByRole('tab')
        .map((tab) => tab.textContent),
    ).toEqual(['Оригинал (Русский)', 'Қазақша']);

    fireEvent.click(within(dialog).getByRole('button', { name: ru['news.versions.add'] }));
    fireEvent.click(await screen.findByRole('menuitem', { name: '中文' }));

    expect(within(dialog).getByRole('tab', { name: '中文' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    fireEvent.change(
      within(dialog).getByRole('textbox', { name: ru['news.versions.titleLabel'] }),
      {
        target: { value: 'KTTF 开放了' },
      },
    );
    fireEvent.change(within(dialog).getByRole('textbox', { name: ru['news.versions.bodyLabel'] }), {
      target: { value: '平台已开放' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: ru['news.versions.save'] }));

    await waitFor(() => {
      expect(requests.find((row) => row.method === 'PUT')).toMatchObject({
        url: expect.stringContaining(`/forum/topics/${TOPIC_ID}/translations/zh`) as unknown,
        body: { title: 'KTTF 开放了', body: '平台已开放', image: null },
      });
    });
  });

  it('у существующей версии — «Удалить версию»', async () => {
    asModerator();
    renderUi(<NewsVersionsEditor topic={TOPIC} />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: ru['news.versions.open'].replace('{count}', '2'),
      }),
    );
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('tab', { name: 'Қазақша' }));
    expect(
      within(dialog).getByRole<HTMLInputElement>('textbox', {
        name: ru['news.versions.titleLabel'],
      }).value,
    ).toBe('KTTF ашылды');
    fireEvent.click(within(dialog).getByRole('button', { name: ru['news.versions.delete'] }));

    await waitFor(() => {
      expect(requests.find((row) => row.method === 'DELETE')?.url).toContain(
        `/forum/topics/${TOPIC_ID}/translations/kk`,
      );
    });
  });

  it('не новость — редактора нет', () => {
    asModerator();
    renderUi(<NewsVersionsEditor topic={{ ...TOPIC, locale: null, translations: [] }} />);

    expect(screen.queryByRole('button', { name: /Языки новости/ })).toBeNull();
  });
});
