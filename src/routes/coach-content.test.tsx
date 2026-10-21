import type {
  AuthUserView,
  ClubContentItem,
  CoachContentItem,
  CoachMediaView,
  CoachPostView,
} from '@kttf/shared/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { ru } from '@/common/i18n/ru';
import { useSessionStore } from '@/features/auth/session-store';
import { COACH, COACH_LIST_ITEM, COACH_SLUG, userWithCoach } from '@/test/coach-fixtures';
import { ADMIN_USER, CLUB, PLAYER_PROFILE, PLAYERS, pageOf, placesReply } from '@/test/fixtures';

/**
 * Фото, видео и новости тренера — T2.2 (ADR-059, `docs/11` 3.2.2): страница,
 * кабинет и модерация от адреса до запроса по контракту.
 */

interface Sent {
  readonly url: string;
  readonly method: string;
  readonly body: unknown;
}

const POST: CoachPostView = {
  id: '00000000-0000-4000-8000-0000000000f1',
  coachId: COACH.id,
  kind: 'PROMO',
  title: 'Набор в детскую группу',
  body: 'Первое занятие бесплатно.',
  imageUrl: null,
  validUntil: '2099-12-31',
  pinned: true,
  publishedAt: '2026-10-20T10:00:00.000Z',
  editedAt: null,
  hidden: false,
  hiddenReason: null,
};

const HIDDEN_POST: CoachPostView = {
  ...POST,
  id: '00000000-0000-4000-8000-0000000000f2',
  kind: 'NEWS',
  title: 'Скрытая запись',
  validUntil: null,
  pinned: false,
  hidden: true,
  hiddenReason: 'реклама чужого зала',
};

const VIDEO: CoachMediaView = {
  id: '00000000-0000-4000-8000-0000000000e1',
  coachId: COACH.id,
  kind: 'VIDEO',
  imageUrl: '/api/v1/files/coaches/00000000-0000-4000-8000-0000000000e9.webp',
  youtubeId: 'dQw4w9WgXcQ',
  width: 1280,
  height: 720,
  caption: 'Подача',
  createdAt: '2026-10-20T10:00:00.000Z',
  hidden: false,
  hiddenReason: null,
};

const HIDDEN_PHOTO: CoachMediaView = {
  ...VIDEO,
  id: '00000000-0000-4000-8000-0000000000e2',
  kind: 'PHOTO',
  youtubeId: null,
  caption: null,
  hidden: true,
  hiddenReason: 'чужое фото',
};

const COACH_ITEM: CoachContentItem = {
  kind: 'POST',
  id: POST.id,
  coach: { id: COACH.id, slug: COACH_SLUG, name: 'Иванов Иван' },
  createdAt: POST.publishedAt,
  title: POST.title,
  excerpt: POST.body,
  imageUrl: null,
  youtubeId: null,
  hidden: false,
  hiddenReason: null,
};

const CLUB_ITEM: ClubContentItem = {
  kind: 'MEDIA',
  id: '00000000-0000-4000-8000-0000000000c1',
  club: { id: CLUB.id, name: CLUB.name },
  createdAt: POST.publishedAt,
  title: null,
  excerpt: null,
  imageUrl: null,
  youtubeId: null,
  hidden: false,
  hiddenReason: null,
};

let sent: Sent[] = [];
let posts: CoachPostView[] = [];
let media: CoachMediaView[] = [];
let feed: CoachContentItem[] = [];
let refusal: string | null = null;
let me: AuthUserView | null = null;

function reply(body: unknown, status = 200): Response {
  return {
    ok: status < 400,
    status,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
  } as unknown as Response;
}

function answer(url: string, init: RequestInit | undefined): Response {
  const method = init?.method ?? 'GET';
  const raw = init?.body;
  const path = url.replace(/^\/api\/v1/, '');

  sent.push({ url: path, method, body: typeof raw === 'string' ? JSON.parse(raw) : undefined });

  const places = placesReply(url);
  if (places !== undefined) return reply(places);

  if (path.startsWith('/auth/me')) return reply(me);
  if (path.startsWith('/admin/coach-content?')) return reply(pageOf(feed));
  if (path.startsWith('/admin/club-content?')) return reply(pageOf([CLUB_ITEM]));
  if (path.startsWith('/admin/')) return reply(undefined, 204);
  if (refusal !== null && method === 'POST' && path.includes('/media/')) {
    return reply({ error: { code: refusal, message: 'limit' } }, 403);
  }
  if (/^\/coaches\/[^/]+\/posts\/all/.test(path)) return reply(pageOf([POST, HIDDEN_POST]));
  if (/^\/coaches\/[^/]+\/posts/.test(path)) {
    return method === 'GET' ? reply(pageOf(posts)) : reply(POST);
  }
  if (/^\/coaches\/[^/]+\/media\/all$/.test(path)) return reply([VIDEO, HIDDEN_PHOTO]);
  if (/^\/coaches\/[^/]+\/media$/.test(path)) return reply(media);
  if (/^\/coaches\/[^/]+\/media\//.test(path)) {
    return method === 'DELETE' ? reply(undefined, 204) : reply(VIDEO);
  }
  if (/^\/coaches\/[^/]+\/students$/.test(path)) {
    return reply({
      current: 3,
      younger: 0,
      former: 0,
      top: [],
      medals: { total: 0, recent: [] },
      growth: [],
      tournaments: [],
    });
  }
  if (/^\/coaches\/[^/]+\/events$/.test(path)) return reply(undefined, 204);
  if (path.startsWith('/coaches/by-slug/')) return reply(COACH);
  if (/^\/coaches\/[^/?]+$/.test(path)) return reply(COACH);
  if (path.startsWith('/coaches')) return reply(pageOf([COACH_LIST_ITEM]));
  if (path.includes('/summary')) {
    return reply({
      playerId: PLAYERS.first.id,
      rank: 1,
      rankedPlayers: 10,
      maxRating: '520.00',
      maxRatingAt: null,
      period: 'ALL',
      tournaments: 2,
      wins: 1,
      losses: 1,
      firstTournament: null,
      favoriteClub: null,
      bestWins: [],
      awards: [],
    });
  }
  if (path.includes('/best-wins')) return reply({ period: 'ALL', items: [] });
  if (path.includes('/rating-history')) return reply({ playerId: PLAYERS.first.id, points: [] });
  if (path.includes('/tournaments')) return reply(pageOf([]));
  if (/^\/players\/[^/?]+$/.test(path)) return reply(PLAYER_PROFILE);

  throw new Error(`Неожидаемый запрос: ${method} ${url}`);
}

function renderAt(path: string, user: AuthUserView | null = null): void {
  me = user;
  useSessionStore.setState({
    user,
    accessToken: user === null ? null : 'access-token',
    isRestoring: false,
  });
  window.history.pushState({}, '', path);

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter({ queryClient, session: user });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

function element(selector: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(selector);
  if (found === null) throw new Error(`Нет элемента ${selector}`);
  return found;
}

const requests = (method: string, part: string): Sent[] =>
  sent.filter((request) => request.method === method && request.url.includes(part));

const before = (first: Element, second: Element): boolean =>
  (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

beforeEach(() => {
  window.sessionStorage.clear();
  sent = [];
  posts = [POST];
  media = [VIDEO];
  feed = [COACH_ITEM];
  refusal = null;
  vi.stubGlobal('fetch', (input: unknown, init: RequestInit | undefined) =>
    Promise.resolve(answer(decodeURIComponent(String(input)), init)),
  );
  vi.stubGlobal('confirm', () => true);
});

afterEach(() => {
  vi.unstubAllGlobals();
  useSessionStore.setState({ user: null, accessToken: null, isRestoring: false });
});

describe('страница тренера: новости, фото и видео', () => {
  it('новости — над квалификацией, видео лентой — за учениками', async () => {
    renderAt(`/coaches/${COACH_SLUG}`);

    const postsBlock = await waitFor(() => element('[data-posts]'));
    expect(
      within(postsBlock).getByRole('heading', { name: ru['coach.posts.title'] }),
    ).toBeDefined();
    expect(postsBlock.textContent).toContain(POST.title);
    expect(postsBlock.textContent).toContain(ru['club.posts.pinned']);
    const qualification = screen.getByRole('heading', { name: ru['coach.qualification.title'] });
    expect(before(postsBlock, qualification)).toBe(true);

    // В тестах окно узкое — раскладка телефона: видео лентой после учеников.
    const gallery = await waitFor(() => element('[data-gallery="strip"]'));
    expect(before(element('#students'), gallery)).toBe(true);
    expect(within(gallery).getByRole('button', { name: VIDEO.caption ?? '' })).toBeDefined();
  });

  it('YouTube грузится только по нажатию на обложку', async () => {
    renderAt(`/coaches/${COACH_SLUG}`);

    const gallery = await waitFor(() => element('[data-gallery]'));
    fireEvent.click(within(gallery).getByRole('button', { name: VIDEO.caption ?? '' }));
    const viewer = await screen.findByRole('dialog');
    expect(viewer.querySelector('iframe')).toBeNull();

    fireEvent.click(within(viewer).getByRole('button', { name: ru['club.gallery.play'] }));
    expect(viewer.querySelector('iframe')?.getAttribute('src')).toContain(
      `youtube-nocookie.com/embed/${VIDEO.youtubeId ?? ''}`,
    );
  });

  it('пустые новости и галерея не выводятся', async () => {
    posts = [];
    media = [];
    renderAt(`/coaches/${COACH_SLUG}`);

    await screen.findByRole('heading', { name: ru['coach.qualification.title'] });
    await waitFor(() => {
      expect(requests('GET', `/coaches/${COACH.id}/media`)).not.toHaveLength(0);
    });
    expect(document.querySelector('[data-posts]')).toBeNull();
    expect(document.querySelector('[data-gallery]')).toBeNull();
  });
});

describe('кабинет тренера: «Новости»', () => {
  it('скрытое — с причиной; закреп и новая запись уходят по контракту', async () => {
    renderAt('/cabinet/coach?tab=posts', userWithCoach(COACH));

    expect(await screen.findByRole('tab', { name: ru['coach.tab.posts'] })).toBeDefined();
    const hidden = await waitFor(() => element(`[data-post="${HIDDEN_POST.id}"]`));
    expect(hidden.textContent).toContain(`${ru['manage.content.hidden']}: реклама чужого зала`);

    fireEvent.click(within(hidden).getByRole('button', { name: ru['manage.posts.pin'] }));
    await waitFor(() => {
      expect(requests('PATCH', `/coaches/${COACH.id}/posts/${HIDDEN_POST.id}`)[0]?.body).toEqual({
        pinned: true,
      });
    });

    fireEvent.click(screen.getByRole('button', { name: ru['manage.posts.new'] }));
    fireEvent.change(screen.getByLabelText(ru['manage.posts.titleField']), {
      target: { value: 'Сборы в Алматы' },
    });
    fireEvent.change(screen.getByLabelText(ru['manage.posts.body']), {
      target: { value: 'Неделя в горах.' },
    });
    fireEvent.click(screen.getByRole('button', { name: ru['manage.posts.publish'] }));

    await waitFor(() => {
      expect(requests('POST', `/coaches/${COACH.id}/posts`)[0]?.body).toEqual({
        kind: 'NEWS',
        title: 'Сборы в Алматы',
        body: 'Неделя в горах.',
        imageUrl: null,
        validUntil: null,
      });
    });
  });
});

describe('кабинет тренера: «Фото и видео»', () => {
  it('счёт с пределами, причина скрытия, подпись, порядок и удаление', async () => {
    renderAt('/cabinet/coach?tab=media', userWithCoach(COACH));

    const photo = await waitFor(() => element(`[data-media-item="${HIDDEN_PHOTO.id}"]`));
    expect(photo.textContent).toContain(`${ru['manage.content.hidden']}: чужое фото`);
    expect(screen.getByText('Фото: 1 из 100 · видео: 1 из 20')).toBeDefined();

    const video = element(`[data-media-item="${VIDEO.id}"]`);
    const caption = within(video).getByLabelText(ru['manage.media.caption']);
    fireEvent.change(caption, { target: { value: 'Подача накатом' } });
    fireEvent.blur(caption);
    await waitFor(() => {
      expect(requests('PATCH', `/coaches/${COACH.id}/media/${VIDEO.id}`)[0]?.body).toEqual({
        caption: 'Подача накатом',
      });
    });

    fireEvent.click(within(video).getByRole('button', { name: ru['manage.prices.down'] }));
    await waitFor(() => {
      expect(requests('PUT', `/coaches/${COACH.id}/media/order`)[0]?.body).toEqual({
        ids: [HIDDEN_PHOTO.id, VIDEO.id],
      });
    });

    fireEvent.click(within(photo).getByRole('button', { name: ru['manage.media.delete'] }));
    await waitFor(() => {
      expect(requests('DELETE', `/coaches/${COACH.id}/media/${HIDDEN_PHOTO.id}`)).toHaveLength(1);
    });
  });

  it('видео по ссылке; предел тренера — понятным текстом', async () => {
    refusal = 'COACH_PLAN_LIMIT';
    renderAt('/cabinet/coach?tab=media', userWithCoach(COACH));

    const field = await screen.findByLabelText(ru['manage.media.videoUrl']);
    fireEvent.change(field, { target: { value: 'https://youtu.be/dQw4w9WgXcQ' } });
    fireEvent.click(screen.getByRole('button', { name: ru['manage.media.addVideo'] }));

    expect(await screen.findByText(ru['error.api.COACH_PLAN_LIMIT'])).toBeDefined();
    expect(requests('POST', `/coaches/${COACH.id}/media/videos`)[0]?.body).toEqual({
      url: 'https://youtu.be/dQw4w9WgXcQ',
    });
  });
});

describe('модерация контента тренеров', () => {
  it('вкладка «Тренеры»: ссылка на страницу, «Скрыть» с причиной', async () => {
    renderAt('/cabinet/content?tab=coaches', ADMIN_USER);

    const row = await waitFor(() => element(`[data-content-item="${POST.id}"]`));
    expect(within(row).getByRole('link', { name: 'Иванов Иван' }).getAttribute('href')).toBe(
      `/coaches/${COACH_SLUG}`,
    );
    expect(requests('GET', '/admin/club-content')).toHaveLength(0);

    fireEvent.change(within(row).getByLabelText(ru['content.coaches.reason']), {
      target: { value: 'спам' },
    });
    fireEvent.click(within(row).getByRole('button', { name: ru['content.hide'] }));

    await waitFor(() => {
      expect(requests('PATCH', `/admin/coach-content/posts/${POST.id}`)[0]?.body).toEqual({
        hidden: true,
        reason: 'спам',
      });
    });
  });

  it('скрытое — с причиной и «Вернуть»; вкладка «Клубы» — прежняя лента', async () => {
    feed = [{ ...COACH_ITEM, kind: 'MEDIA', hidden: true, hiddenReason: 'чужое фото' }];
    renderAt('/cabinet/content?tab=coaches', ADMIN_USER);

    const row = await waitFor(() => element(`[data-content-item="${POST.id}"]`));
    expect(row.textContent).toContain(`${ru['manage.content.hidden']}: чужое фото`);
    fireEvent.click(within(row).getByRole('button', { name: ru['content.show'] }));
    await waitFor(() => {
      expect(requests('PATCH', `/admin/coach-content/media/${POST.id}`)[0]?.body).toEqual({
        hidden: false,
        reason: null,
      });
    });

    fireEvent.click(screen.getByRole('tab', { name: ru['content.tab.clubs'] }));
    const club = await waitFor(() => element(`[data-content-item="${CLUB_ITEM.id}"]`));
    expect(within(club).getByRole('link', { name: CLUB.name }).getAttribute('href')).toBe(
      `/clubs/${CLUB.id}`,
    );
  });
});
