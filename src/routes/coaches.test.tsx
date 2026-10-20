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
  CLUB_EVENING,
  CLUB_INVITE,
  CLUB_MANAGE,
  COACH_REQUEST,
  KIDS_GROUP,
  TRAINING_GROUPS,
  VENUE_TRAINING,
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
let trainings: unknown[] = TRAINING_GROUPS;
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
  if (/^\/trainings\/[^/]+\/(confirm|decline)$/.test(path)) return reply(undefined, 204);
  if (path === `/trainings/${KIDS_GROUP.id}`) {
    return reply({ ...KIDS_GROUP, booking: 'CLUB', more: [] });
  }
  if (path === `/trainings/${CLUB_EVENING.id}`) {
    return reply({ ...CLUB_EVENING, description: 'Разминка.\nИгра на счёт.', more: [CLUB_INVITE] });
  }
  if (/^\/trainings\/[0-9a-f-]{36}$/.test(path)) {
    return reply({ error: { code: 'NOT_FOUND', message: 'нет' } }, 404);
  }
  if (path.startsWith('/trainings')) return reply(pageOf(trainings));
  if (/^\/coaches\/[^/]+\/trainings$/.test(path)) return reply(coach);
  if (/^\/clubs\/[^/]+\/trainings\/manage$/.test(path)) return reply(CLUB_MANAGE);
  if (/^\/clubs\/[^/]+\/trainings$/.test(path)) {
    return method === 'PUT' ? reply(CLUB_MANAGE) : reply([CLUB_EVENING]);
  }
  if (/^\/clubs\/[^/]+\/members$/.test(path)) return reply([]);
  if (/^\/clubs\/[^/]+\/posts/.test(path)) return reply(pageOf([]));
  if (/^\/clubs\/[^/]+\/media/.test(path)) return reply([]);
  if (/^\/clubs\/[^/]+\/summary$/.test(path)) {
    return reply({ matchesRecent: 0, activePlayersRecent: 0, tournamentsHeld: 0, podiums: [] });
  }
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

/** Элемент по селектору — без него тест падает понятной ошибкой. */
function element(selector: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(selector);
  if (found === null) throw new Error(`Нет элемента ${selector}`);
  return found;
}

const requests = (method: string, part: string): Sent[] =>
  sent.filter((request) => request.method === method && request.url.includes(part));

beforeEach(() => {
  // Просмотр считается раз за сессию — у каждого теста своя.
  window.sessionStorage.clear();
  sent = [];
  coach = COACH;
  trainings = TRAINING_GROUPS;
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
  it('блоками по месту: клуб ссылкой, зал вне KTTF, «выезд и онлайн» последним', async () => {
    renderAt('/trainings');

    const club = await screen.findByRole('link', { name: CLUB.name });
    expect(club.getAttribute('href')).toBe(`/clubs/${CLUB.id}`);

    const groups = [...document.querySelectorAll('[data-training-group]')].map((group) =>
      group.getAttribute('data-training-group'),
    );
    expect(groups).toEqual(['CLUB', 'VENUE', 'ANYWHERE']);

    const venue = element('[data-training-group="VENUE"]');
    expect(venue.textContent).toContain('Сатпаева 3 · зал не в KTTF');
    expect(within(venue).queryByRole('link', { name: /Спортзал/ })).toBeNull();

    // Тренер в строке — ссылкой на свою страницу.
    const row = element(`[data-training="${KIDS_GROUP.id}"]`);
    expect(
      within(row)
        .getByRole('link', { name: `${PLAYERS.first.lastName} ${PLAYERS.first.firstName}` })
        .getAttribute('href'),
    ).toBe(`/coaches/${COACH_SLUG}`);
    expect(within(row).getByText('дети с 6 лет')).toBeDefined();
  });

  it('фильтры из ссылки доходят до сервера, клуб — clubId', async () => {
    renderAt(
      `/trainings?kind=KIDS_GROUP&audience=KIDS,TEENS&age=9&priceTo=20000&language=KK&clubId=${CLUB.id}`,
    );

    await screen.findByRole('link', { name: CLUB.name });
    const [query] = requests('GET', '/trainings?');

    expect(query?.url).toContain('kind=KIDS_GROUP');
    expect(query?.url).toContain('audience=KIDS,TEENS');
    expect(query?.url).toContain('age=9');
    expect(query?.url).toContain('priceTo=20000');
    expect(query?.url).toContain('language=KK');
    expect(query?.url).toContain(`clubId=${CLUB.id}`);
  });

  it('чип вида кладёт фильтр в адрес', async () => {
    renderAt('/trainings');

    await screen.findByRole('link', { name: CLUB.name });
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
      ru['training.part.own'],
      ru['training.part.inClubs'],
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
    expect(screen.getAllByText('по договорённости').length).toBeGreaterThan(0);

    // Место: клуб ссылкой, зал с адресом; клубная — «тренировка клуба X».
    const kids = element(`[data-training="${KIDS_GROUP.id}"]`);
    expect(
      within(kids)
        .getByRole('link', { name: /Абая 10/ })
        .getAttribute('href'),
    ).toBe(`/clubs/${CLUB.id}`);
    const venue = document.querySelector(`[data-training="${VENUE_TRAINING.id}"]`);
    expect(venue?.textContent).toContain('Спортзал школы №5 · Сатпаева 3');
    const evening = element(`[data-training="${CLUB_EVENING.id}"]`);
    expect(evening.textContent).toContain(`${ru['training.via.clubNamed']} ${CLUB.name}`);
  });

  it('телефон — своя раскладка в одну колонку', async () => {
    renderAt(`/coaches/${COACH_SLUG}`);

    await screen.findByText(ru['training.part.own']);

    expect(document.querySelector('[data-coach-layout="phone"]')).not.toBeNull();
  });

  it('просмотр опубликованной страницы считается', async () => {
    renderAt(`/coaches/${COACH_SLUG}`);

    await screen.findByText(ru['training.part.own']);

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

  it('вкладка «Тренировки» сохраняет свои тренировки с id — связь с клубом не сбрасывается', async () => {
    renderAt('/cabinet/coach?tab=trainings', userWithCoach(COACH));

    fireEvent.click(await screen.findByRole('button', { name: ru['manage.page.save'] }));

    await waitFor(() => {
      expect(requests('PUT', `/coaches/${COACH.id}/trainings`).length).toBe(1);
    });
    const body = requests('PUT', `/coaches/${COACH.id}/trainings`)[0]?.body as {
      trainings: { id?: string; clubId?: string | null; venueName?: string | null }[];
    };
    // Клубная вечерняя группа в теле не участвует — её ведёт клуб.
    expect(body.trainings.map((training) => training.id)).toEqual([
      KIDS_GROUP.id,
      COACH.trainings[1]?.id,
      VENUE_TRAINING.id,
    ]);
    expect(body.trainings[0]?.clubId).toBe(CLUB.id);
    expect(body.trainings[2]?.venueName).toBe('Спортзал школы №5');
  });

  it('приглашение клуба подтверждается, клубная тренировка — «Отказаться»', async () => {
    coach = { ...COACH, trainingRequests: [CLUB_INVITE] };
    renderAt('/cabinet/coach?tab=trainings', userWithCoach(COACH));

    expect(
      await screen.findByRole('tab', { name: `${ru['coach.tab.services']} (1)` }),
    ).toBeDefined();
    const invites = await waitFor(() => {
      const found = document.querySelector('[data-linked-trainings="requests"]');
      if (found === null) throw new Error('нет приглашений');
      return found as HTMLElement;
    });
    fireEvent.click(within(invites).getByRole('button', { name: ru['training.link.confirm'] }));
    await waitFor(() => {
      expect(requests('POST', `/trainings/${CLUB_INVITE.id}/confirm`).length).toBe(1);
    });

    const owned = element('[data-linked-trainings="confirmed"]');
    fireEvent.click(within(owned).getByRole('button', { name: ru['training.link.leave'] }));
    await waitFor(() => {
      expect(requests('POST', `/trainings/${CLUB_EVENING.id}/decline`).length).toBe(1);
    });
  });
});

describe('владелец тренировки и «Записаться»', () => {
  it('блок клуба — две части: группы клуба с «Тренер: X» и тренеры в клубе', async () => {
    renderAt('/trainings');

    await screen.findByRole('link', { name: CLUB.name });
    const clubPart = element('[data-training-group="CLUB"] [data-training-part="CLUB"]');
    const coachPart = element('[data-training-group="CLUB"] [data-training-part="COACH"]');

    expect(within(clubPart).getByText(ru['training.part.clubGroups'])).toBeDefined();
    expect(within(clubPart).getByRole('link', { name: CLUB_EVENING.title })).toBeDefined();
    expect(clubPart.textContent).toContain(
      `${ru['training.via.club']} · ${ru['training.via.groupCoach']} ${PLAYERS.first.lastName} ${PLAYERS.first.firstName}`,
    );
    expect(coachPart.textContent).toContain(ru['training.via.coach']);
    expect(within(coachPart).getByText(ru['training.part.coaches'])).toBeDefined();
    expect(within(coachPart).getByRole('link', { name: KIDS_GROUP.title })).toBeDefined();

    // Группа клуба — «Записаться» в WhatsApp клуба, своя тренировка тренера — тренеру.
    const evening = element(`[data-training="${CLUB_EVENING.id}"]`);
    const kids = element(`[data-training="${KIDS_GROUP.id}"]`);
    expect(
      within(evening).getByRole('link', { name: ru['training.enroll'] }).getAttribute('href'),
    ).toContain('https://wa.me/77770000000?text=');
    expect(
      within(kids).getByRole('link', { name: ru['training.enroll'] }).getAttribute('href'),
    ).toContain('https://wa.me/77011234567?text=');
    expect(
      within(evening).getByRole('link', { name: ru['training.details'] }).getAttribute('href'),
    ).toBe(`/trainings/${CLUB_EVENING.id}`);
  });

  it('«Записаться» считается в статистику владельца — клуба', async () => {
    renderAt('/trainings');

    await screen.findByRole('link', { name: CLUB.name });
    fireEvent.click(
      within(element(`[data-training="${CLUB_EVENING.id}"]`)).getByRole('link', {
        name: ru['training.enroll'],
      }),
    );

    // Клубу — обращение по каналу, тренеру группы — «записи в группы клуба».
    await waitFor(() => {
      expect(requests('POST', `/clubs/${CLUB.id}/events`)[0]?.body).toEqual({
        kind: 'WHATSAPP',
        source: 'ORGANIC',
      });
      expect(requests('POST', `/coaches/${COACH.id}/events`)[0]?.body).toEqual({
        kind: 'CLUB_GROUP',
        source: 'ORGANIC',
      });
    });
  });

  it('личная тренировка тренера в зале клуба: тренеру — канал, клубу — COACH_TRAINING', async () => {
    renderAt('/trainings');

    await screen.findByRole('link', { name: CLUB.name });
    fireEvent.click(
      within(element(`[data-training="${KIDS_GROUP.id}"]`)).getByRole('link', {
        name: ru['training.enroll'],
      }),
    );

    await waitFor(() => {
      expect(requests('POST', `/coaches/${COACH.id}/events`)[0]?.body).toEqual({
        kind: 'WHATSAPP',
        source: 'ORGANIC',
      });
      expect(requests('POST', `/clubs/${CLUB.id}/events`)[0]?.body).toEqual({
        kind: 'COACH_TRAINING',
        source: 'ORGANIC',
      });
    });
  });

  it('связь ждёт ответа — у строки метка, а не вид опубликованной', async () => {
    coach = {
      ...COACH,
      trainings: COACH.trainings.map((training) =>
        training.id === KIDS_GROUP.id ? { ...training, link: 'PENDING' as const } : training,
      ),
    };
    renderAt(`/coaches/${COACH_SLUG}`, userWithCoach(COACH));

    await screen.findByText(ru['training.part.own']);
    const kids = element(`[data-training="${KIDS_GROUP.id}"]`);

    expect(within(kids).getByText(ru['training.link.coach.PENDING'])).toBeDefined();
  });

  it('страница тренировки: владелец, одна главная «Записаться», место, тренер, другие', async () => {
    asDesktop();
    renderAt(`/trainings/${CLUB_EVENING.id}`);

    expect(
      await screen.findByRole('heading', { level: 1, name: CLUB_EVENING.title }),
    ).toBeDefined();
    expect(element('[data-training-owner="CLUB"]').textContent).toContain(
      `${ru['training.detail.ofClub']} ${CLUB.name}`,
    );

    const contacts = element('[data-training-contacts]');
    const primary = contacts.querySelectorAll('.MuiButton-contained');
    expect(primary.length).toBe(1);
    expect(primary[0]?.textContent).toBe(ru['training.enroll']);
    expect(primary[0]?.getAttribute('href')).toContain('https://wa.me/77770000000?text=');

    // Группа клуба: записывает клуб, тренер на него работает и без контактов.
    expect(element('[data-training-enrolls="CLUB"]').textContent).toBe(
      `Записывает клуб ${CLUB.name}`,
    );
    const groupCoach = element('[data-training-coach="CLUB"]');
    expect(groupCoach.textContent).toContain(`Работает в клубе ${CLUB.name}`);
    expect(screen.getByRole('heading', { name: ru['training.detail.groupCoach'] })).toBeDefined();
    expect(within(groupCoach).queryByRole('link', { name: /WhatsApp|Позвонить/ })).toBeNull();

    expect(element('[data-training-description]').textContent).toBe('Разминка.\nИгра на счёт.');
    expect(
      screen.getByRole('link', { name: ru['club.contact.route'] }).getAttribute('href'),
    ).toContain('https://2gis.kz/search/');
    expect(
      screen
        .getAllByRole('link', { name: `${PLAYERS.first.lastName} ${PLAYERS.first.firstName}` })[0]
        ?.getAttribute('href'),
    ).toBe(`/coaches/${COACH_SLUG}`);
    expect(screen.getByRole('heading', { name: ru['training.detail.moreClub'] })).toBeDefined();
    expect(screen.getByText(CLUB_INVITE.title)).toBeDefined();
  });

  it('тренер записывает через клуб: «запись через клуб» и «Записывает клуб»', async () => {
    renderAt(`/trainings/${KIDS_GROUP.id}`);

    const owner = await waitFor(() => element('[data-training-owner="COACH"]'));
    expect(owner.textContent).toContain(`· ${ru['training.via.club'].toLowerCase()}`);
    expect(element('[data-training-enrolls="CLUB"]').textContent).toBe(
      `Записывает клуб ${CLUB.name}`,
    );
    const primary = element('[data-training-contacts]').querySelector('.MuiButton-contained');
    expect(primary?.getAttribute('href')).toContain('https://wa.me/77770000000?text=');
  });

  it('неизвестная тренировка — «тренировка не найдена»', async () => {
    renderAt('/trainings/00000000-0000-4000-8000-00000000ffff');

    expect(await screen.findByText(ru['training.notFound'])).toBeDefined();
  });
});

describe('кто записывает — в редакторе тренера', () => {
  it('переключатель только у клуба KTTF; «Клуб» уходит в теле, другой зал его сбрасывает', async () => {
    renderAt('/cabinet/coach?tab=trainings', userWithCoach(COACH));

    await screen.findByRole('button', { name: ru['manage.page.save'] });
    // Из трёх своих тренировок клуб KTTF выбран только у детской группы.
    expect(document.querySelectorAll('[data-training-booking]')).toHaveLength(1);

    const booking = element('[data-training-booking]');
    fireEvent.click(
      within(booking).getByRole('radio', { name: ru['training.editor.bookingClub'] }),
    );
    fireEvent.click(screen.getByRole('button', { name: ru['manage.page.save'] }));

    await waitFor(() => {
      const body = requests('PUT', `/coaches/${COACH.id}/trainings`)[0]?.body as {
        trainings: { booking?: string }[];
      };
      expect(body.trainings.map((training) => training.booking)).toEqual([
        'CLUB',
        'COACH',
        'COACH',
      ]);
    });

    const kids = element('[data-training-row]');
    fireEvent.click(within(kids).getByRole('radio', { name: ru['training.editor.modeVenue'] }));

    expect(document.querySelectorAll('[data-training-booking]')).toHaveLength(0);
  });
});

describe('тренировки клуба', () => {
  it('на странице клуба — «Тренировки в клубе» с тренером ссылкой', async () => {
    renderAt(`/clubs/${CLUB.id}`);

    await screen.findByText(CLUB_EVENING.title);
    const section = element('[data-club-trainings]');

    expect(
      within(section).getByRole('heading', { name: ru['training.inClub.title'] }),
    ).toBeDefined();
    expect(
      within(section)
        .getByRole('link', { name: `${PLAYERS.first.lastName} ${PLAYERS.first.firstName}` })
        .getAttribute('href'),
    ).toBe(`/coaches/${COACH_SLUG}`);
  });

  it('кабинет клуба: запросы тренеров с числом на вкладке, свои — списком с id и тренером', async () => {
    renderAt(`/cabinet/club/${CLUB.id}?tab=trainings`, USER_WITH_PROFILE);

    expect(await screen.findByRole('tab', { name: `${ru['nav.trainings']} (1)` })).toBeDefined();

    const incoming = await waitFor(() => {
      const found = document.querySelector('[data-linked-trainings="requests"]');
      if (found === null) throw new Error('нет запросов');
      return found as HTMLElement;
    });
    expect(within(incoming).getByText(COACH_REQUEST.title)).toBeDefined();
    fireEvent.click(within(incoming).getByRole('button', { name: ru['training.link.decline'] }));
    await waitFor(() => {
      expect(requests('POST', `/trainings/${COACH_REQUEST.id}/decline`).length).toBe(1);
    });

    fireEvent.click(screen.getByRole('button', { name: ru['manage.page.save'] }));
    await waitFor(() => {
      expect(requests('PUT', `/clubs/${CLUB.id}/trainings`)[0]?.body).toEqual({
        trainings: [
          {
            id: CLUB_EVENING.id,
            kind: 'GROUP',
            audiences: ['AMATEURS'],
            kidsFromAge: null,
            title: 'Вечерняя группа',
            schedule: 'вт, чт 19:00',
            priceKzt: 15000,
            unit: 'MONTH',
            note: null,
            description: null,
            coachId: COACH.id,
          },
        ],
      });
    });

    const coaches = element('[data-linked-trainings="confirmed"]');
    expect(within(coaches).getByRole('button', { name: ru['training.link.remove'] })).toBeDefined();
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
