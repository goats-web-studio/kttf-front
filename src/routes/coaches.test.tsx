import type {
  AuthUserView,
  CoachApplicationView,
  CoachView,
  PlayerProfileView,
} from '@kttf/shared/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { ru } from '@/common/i18n/ru';
import { useSessionStore } from '@/features/auth/session-store';
import {
  COACH,
  COACH_APPLICATION,
  COACH_LIST_ITEM,
  COACH_SLUG,
  DRAFT_COACH,
  TRAINING_ITEM,
  userWithCoach,
} from '@/test/coach-fixtures';
import {
  ADMIN_USER,
  CLUB,
  PLAYER_PROFILE,
  PLAYERS,
  pageOf,
  placesReply,
  USER_WITH_PROFILE,
} from '@/test/fixtures';

/** Тело строки без идентификатора — так её отправляет форма. */
function withoutId(row: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'id'));
}

/**
 * Раздел «Тренировки» от адреса до данных — ADR-059, `docs/11` 5.
 *
 * Стережётся связка: маршрут, запрос по контракту, разбор ответа и показ —
 * фильтры из ссылки доходят до сервера, неопубликованная страница видна
 * владельцу с плашкой статуса, кабинет отправляет на проверку, а
 * администратор отклоняет только с причиной.
 */

interface Sent {
  readonly url: string;
  readonly method: string;
  readonly body: unknown;
}

let sent: Sent[] = [];
let coach: CoachView = COACH;
let trainings: unknown[] = [TRAINING_ITEM];
let applications: CoachApplicationView[] = [COACH_APPLICATION];
let me: AuthUserView = USER_WITH_PROFILE;
let profile: PlayerProfileView = PLAYER_PROFILE;

const SUMMARY = {
  playerId: PLAYERS.first.id,
  rank: 3,
  rankedPlayers: 40,
  maxRating: '612.00',
  maxRatingAt: null,
  period: 'ALL',
  tournaments: 17,
  wins: 2,
  losses: 1,
  firstTournament: null,
  favoriteClub: null,
  bestWins: [],
  awards: [],
};

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
  if (path.startsWith('/trainings')) return reply(pageOf(trainings));
  if (/^\/coaches\/[^/]+\/events$/.test(path)) return reply(undefined, 204);
  if (path.startsWith('/coaches/by-slug/')) {
    return path.endsWith(`/${COACH_SLUG}`)
      ? reply(coach)
      : reply({ error: { code: 'NOT_FOUND', message: 'нет' } }, 404);
  }
  if (/^\/coaches\/[^/]+\/submit$/.test(path)) return reply({ ...coach, status: 'PENDING' });
  if (path === '/coaches' && method === 'POST') return reply(DRAFT_COACH);
  if (/^\/coaches\/[^/?]+$/.test(path)) return reply(coach);
  if (path.startsWith('/coaches')) return reply(pageOf([COACH_LIST_ITEM]));
  if (path.startsWith('/admin/coaches?')) return reply(pageOf(applications));
  if (path.startsWith('/admin/coaches/')) return reply(coach);
  if (path.startsWith('/admin/club-applications')) return reply(pageOf([]));
  if (path.includes('/summary')) return reply(SUMMARY);
  if (path.includes('/best-wins')) return reply({ period: 'ALL', items: [] });
  if (path.includes('/rating-history')) return reply({ playerId: PLAYERS.first.id, points: [] });
  if (path.includes('/tournaments')) return reply(pageOf([]));
  if (/^\/clubs\/[^/?]+$/.test(path)) return reply(CLUB);
  if (path.startsWith('/clubs')) return reply(pageOf([CLUB]));
  if (/^\/players\/[^/?]+$/.test(path)) return reply(profile);

  throw new Error(`Неожидаемый запрос: ${method} ${url}`);
}

function renderAt(path: string, user: AuthUserView | null = null): void {
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

/** Десктоп для `useMediaQuery`: в jsdom `matchMedia` нет, и без неё — телефон. */
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

const requests = (method: string, part: string): Sent[] =>
  sent.filter((request) => request.method === method && request.url.includes(part));

beforeEach(() => {
  // Просмотр считается раз за сессию — у каждого теста своя.
  window.sessionStorage.clear();
  sent = [];
  coach = COACH;
  trainings = [TRAINING_ITEM];
  applications = [COACH_APPLICATION];
  me = USER_WITH_PROFILE;
  profile = PLAYER_PROFILE;
  vi.stubGlobal('fetch', (input: unknown, init: RequestInit | undefined) =>
    Promise.resolve(answer(decodeURIComponent(String(input)), init)),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  useSessionStore.setState({ user: null, accessToken: null, isRestoring: false });
});

describe('«Тренировки»', () => {
  it('открываются без входа: карточка тренировки ведёт на страницу тренера', async () => {
    renderAt('/trainings');

    const card = await screen.findByRole('link', { name: TRAINING_ITEM.title });

    expect(card.getAttribute('href')).toBe(`/coaches/${COACH_SLUG}`);
    expect(within(card).getByText('дети с 6 лет')).toBeDefined();
  });

  it('фильтры из ссылки доходят до сервера', async () => {
    renderAt('/trainings?kind=KIDS_GROUP&audience=KIDS,TEENS&age=9&priceTo=20000&language=KK');

    await screen.findByRole('link', { name: TRAINING_ITEM.title });
    const [query] = requests('GET', '/trainings?');

    expect(query?.url).toContain('kind=KIDS_GROUP');
    expect(query?.url).toContain('audience=KIDS,TEENS');
    expect(query?.url).toContain('age=9');
    expect(query?.url).toContain('priceTo=20000');
    expect(query?.url).toContain('language=KK');
  });

  it('чип вида кладёт фильтр в адрес', async () => {
    renderAt('/trainings');

    await screen.findByRole('link', { name: TRAINING_ITEM.title });
    fireEvent.click(screen.getByRole('button', { name: ru['coach.kind.SPARRING'] }));

    await waitFor(() => {
      expect(window.location.search).toContain('kind=SPARRING');
    });
  });

  it('пусто по фильтру — объяснение и «Сбросить все»', async () => {
    trainings = [];
    renderAt('/trainings?kind=CAMP');

    expect(await screen.findByText(ru['trainings.notFound.title'])).toBeDefined();
    fireEvent.click(screen.getAllByRole('button', { name: ru['filter.resetAll'] })[0] as Element);

    await waitFor(() => {
      expect(window.location.search).toBe('');
    });
  });

  it('пусто без фильтров — приглашение стать тренером', async () => {
    trainings = [];
    renderAt('/trainings');

    expect(await screen.findByText(ru['trainings.empty.title'])).toBeDefined();
  });

  it('переключатель «Тренеры» ведёт на список тренеров', async () => {
    renderAt('/trainings');

    const views = await screen.findByRole('radiogroup', { name: ru['trainings.view.label'] });
    fireEvent.click(within(views).getByRole('radio', { name: ru['trainings.view.coaches'] }));

    const card = await screen.findByRole('link', {
      name: `${PLAYERS.first.lastName} ${PLAYERS.first.firstName}`,
    });
    expect(window.location.search).toContain('view=coaches');
    expect(requests('GET', '/coaches?').length).toBeGreaterThan(0);
    expect(card.getAttribute('href')).toBe(`/coaches/${COACH_SLUG}`);
  });
});

describe('страница тренера', () => {
  it('десктоп: шапка, одна главная кнопка связи, блоки по порядку', async () => {
    asDesktop();
    renderAt(`/coaches/${COACH_SLUG}`);

    expect(await screen.findByRole('heading', { level: 1, name: /.+/ })).toBeDefined();
    expect(screen.getByText('тренирует с 2015 года', { exact: false })).toBeDefined();

    // Главная кнопка одна — WhatsApp, с готовым текстом (`docs/11` 3.1).
    const contacts = document.querySelector('[data-coach-contacts]');
    const primary = contacts?.querySelectorAll('.MuiButton-contained');
    expect(primary?.length).toBe(1);
    expect(primary?.[0]?.getAttribute('href')).toContain('https://wa.me/77011234567?text=');

    const headings = screen.getAllByRole('heading', { level: 2 }).map((node) => node.textContent);
    const order = [
      ru['coach.services.title'],
      ru['coach.qualification.title'],
      ru['coach.achievements.title'],
      ru['coach.about.title'],
      ru['coach.game.title'],
    ].map((title) => headings.indexOf(title));
    expect(
      order.every(
        (index, position) => index >= 0 && (position === 0 || index > (order[position - 1] ?? -1)),
      ),
    ).toBe(true);

    expect(screen.getByText(ru['coach.credential.verified'])).toBeDefined();
    expect(screen.getByText('по договорённости')).toBeDefined();
  });

  it('телефон — своя раскладка в одну колонку', async () => {
    renderAt(`/coaches/${COACH_SLUG}`);

    await screen.findByText(ru['coach.services.title']);

    expect(document.querySelector('[data-coach-layout="phone"]')).not.toBeNull();
  });

  it('просмотр опубликованной страницы считается', async () => {
    renderAt(`/coaches/${COACH_SLUG}`);

    await screen.findByText(ru['coach.services.title']);

    await waitFor(() => {
      expect(requests('POST', `/coaches/${COACH.id}/events`)[0]?.body).toEqual({
        kind: 'VIEW',
        source: 'ORGANIC',
      });
    });
  });

  it('владельцу черновика — плашка статуса и «Править»', async () => {
    coach = { ...COACH, status: 'DRAFT' };
    renderAt(`/coaches/${COACH_SLUG}`, userWithCoach(coach));

    const edit = await screen.findByRole('link', { name: ru['coach.edit'] });

    expect(edit.closest('[data-coach-status]')?.getAttribute('data-coach-status')).toBe('DRAFT');
    expect(edit.getAttribute('href')).toBe('/cabinet/coach');
    // Свой черновик — не просмотр.
    expect(requests('POST', '/events')).toEqual([]);
  });

  it('неизвестный адрес — «страница тренера не найдена»', async () => {
    renderAt('/coaches/nobody');

    expect(await screen.findByText(ru['coach.notFound'])).toBeDefined();
  });
});

describe('кабинет тренера', () => {
  it('«Стать тренером» заводит страницу, перечитывает сессию и открывает редактор', async () => {
    me = userWithCoach(DRAFT_COACH);
    coach = DRAFT_COACH;
    renderAt('/cabinet', USER_WITH_PROFILE);

    fireEvent.click(await screen.findByRole('button', { name: ru['coach.become.action'] }));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/cabinet/coach');
    });
    expect(requests('POST', '/coaches').length).toBe(1);
    expect(requests('GET', '/auth/me').length).toBeGreaterThan(0);
  });

  it('без города и тренировок отправить нельзя — и сказано, чего не хватает', async () => {
    coach = DRAFT_COACH;
    renderAt('/cabinet/coach', userWithCoach(DRAFT_COACH));

    const submit = await screen.findByRole('button', { name: ru['coach.submit'] });

    expect((submit as HTMLButtonElement).disabled).toBe(true);
    expect(document.querySelector('[data-coach-missing]')?.textContent).toBe(
      'Чтобы отправить, не хватает: города, хотя бы одной тренировки.',
    );
  });

  it('заполненный черновик уходит на проверку', async () => {
    coach = { ...COACH, status: 'DRAFT' };
    renderAt('/cabinet/coach', userWithCoach(coach));

    fireEvent.click(await screen.findByRole('button', { name: ru['coach.submit'] }));

    await waitFor(() => {
      expect(requests('POST', `/coaches/${COACH.id}/submit`).length).toBe(1);
    });
  });

  it('вкладка «Тренировки» сохраняет список целиком', async () => {
    renderAt('/cabinet/coach?tab=services', userWithCoach(COACH));

    fireEvent.click(await screen.findByRole('button', { name: ru['manage.page.save'] }));

    await waitFor(() => {
      expect(requests('PUT', `/coaches/${COACH.id}/services`)[0]?.body).toEqual({
        services: COACH.services.map(withoutId),
      });
    });
  });
});

describe('заявки тренеров у администратора', () => {
  it('по умолчанию — ждущие проверки; отклонить можно только с причиной', async () => {
    renderAt('/cabinet/applications?tab=coaches', ADMIN_USER);

    const card = await screen.findByRole('button', { name: ru['applications.coaches.reject'] });
    expect(requests('GET', '/admin/coaches?')[0]?.url).toContain('status=PENDING');

    fireEvent.click(card);
    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: ru['applications.coaches.reject'] });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(within(dialog).getByLabelText(ru['applications.coaches.reason']), {
      target: { value: 'Нет ни одного документа' },
    });
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(requests('POST', `/admin/coaches/${COACH.id}/reject`)[0]?.body).toEqual({
        reason: 'Нет ни одного документа',
      });
    });
  });

  it('«Проверено KTTF» у документа ставится переключателем', async () => {
    applications = [
      {
        ...COACH_APPLICATION,
        credentials: COACH_APPLICATION.credentials.map((credential) => ({
          ...credential,
          verifiedAt: null,
        })),
      },
    ];
    renderAt('/cabinet/applications?tab=coaches', ADMIN_USER);

    fireEvent.click(await screen.findByRole('switch', { name: ru['coach.credential.verified'] }));

    await waitFor(() => {
      expect(requests('PATCH', `/admin/coaches/${COACH.id}/credentials/`)[0]?.body).toEqual({
        verified: true,
      });
    });
  });
});

describe('тренер в профиле игрока', () => {
  it('со страницей на KTTF — ссылкой на неё', async () => {
    profile = {
      ...PLAYER_PROFILE,
      coachPlayerId: PLAYERS.second.id,
      coachName: 'Сериков Тимур',
      coachSlug: COACH_SLUG,
    };
    renderAt(`/players/${PLAYER_PROFILE.id}`);

    const link = await screen.findByRole('link', { name: 'Сериков Тимур' });

    expect(link.getAttribute('href')).toBe(`/coaches/${COACH_SLUG}`);
  });

  it('вписанный строкой — просто именем', async () => {
    profile = { ...PLAYER_PROFILE, coachName: 'Сериков Тимур', coachSlug: null };
    renderAt(`/players/${PLAYER_PROFILE.id}`);

    expect(await screen.findByText('Сериков Тимур')).toBeDefined();
    expect(screen.queryByRole('link', { name: 'Сериков Тимур' })).toBeNull();
  });
});
