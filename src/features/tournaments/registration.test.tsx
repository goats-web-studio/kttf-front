import type {
  AuthUserView,
  PlayerView,
  RegistrationView,
  TournamentView,
} from '@kttf/shared/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { fill } from '@/common/i18n';
import { ru } from '@/common/i18n/ru';
import { useSessionStore } from '@/features/auth/session-store';
import { playerName } from '@/features/players/player-name';
import { COACH_LIST_ITEM } from '@/test/coach-fixtures';
import {
  CLUB,
  pageOf,
  PLAYERS,
  OWN_REGISTRATION,
  REGISTRATIONS,
  RESULTS,
  TOURNAMENT,
  TOURNAMENT_ID,
  USER_WITH_PROFILE,
  USER_WITHOUT_PROFILE,
} from '@/test/fixtures';

/**
 * Запись на турнир — ТЗ 4.3.
 *
 * Проверяется то, ради чего страница нужна игроку: увидеть условия, записаться
 * и отменить запись. Само правило допуска здесь не переписывается — оно живёт
 * в `@kttf/shared/eligibility` и покрыто там (ADR-029). Здесь стережётся, что
 * его исход доходит до человека **до** нажатия, а отказ сервера — причинами,
 * а не общим текстом проверки схемы.
 */

interface Sent {
  readonly url: string;
  readonly method: string;
  readonly body: unknown;
}

let sent: Sent[] = [];
/**
 * Турнир с открытой записью — дата отсчитывается от сегодня.
 *
 * Дата фикстуры `TOURNAMENT` постоянная и однажды прошла: панель честно
 * сочла запись закрытой, и половина случаев упала от течения времени, а не
 * от ошибки в коде.
 */
function openTournament(): TournamentView {
  return {
    ...TOURNAMENT,
    status: 'REG_OPEN',
    startsAt: new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString(),
    // Запись открыта — значит, турнир не начинался: метки времени
    // завершённого `TOURNAMENT` здесь означали бы начатый турнир, и состав
    // ушёл бы во вкладку результатов.
    startedAt: null,
    finishedAt: null,
    ratedAt: null,
  };
}

let tournament: TournamentView = openTournament();
let registrations: readonly RegistrationView[] = [];
/** Профиль вошедшего: по нему считается допуск до нажатия. */
let profile: PlayerView = PLAYERS.first;
/** Выдача поиска организатора. */
let found: readonly PlayerView[] = [PLAYERS.second];
/** Ответ сервера на запись. `null` — успех. */
let refusal: { readonly code: string; readonly details?: unknown } | null = null;

function reply(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function answer(url: string, init: RequestInit | undefined): Response {
  const method = init?.method ?? 'GET';
  const raw = init?.body;

  sent.push({ url, method, body: typeof raw === 'string' ? JSON.parse(raw) : undefined });

  if (url.includes('/registrations')) {
    if (method === 'GET') {
      return reply(registrations);
    }

    const refused = refusal;

    if (refused !== null) {
      return {
        ok: false,
        status: 400,
        text: () => Promise.resolve(JSON.stringify({ error: { message: 'refused', ...refused } })),
      } as unknown as Response;
    }

    return reply(OWN_REGISTRATION);
  }

  if (/\/tournaments\/[^/]+\/results$/.test(url)) {
    return reply({ ...RESULTS, tournament });
  }

  if (url.includes('/clubs')) {
    return reply(pageOf([CLUB]));
  }

  // Подсказки поля «Тренер» в диалоге тренера на турнире.
  if (url.includes('/coaches')) {
    return reply(pageOf([COACH_LIST_ITEM]));
  }

  // Свой профиль читается ради допуска до нажатия, поиск организатором — ради
  // состава. Маршруты различаются идентификатором в конце, и путать их нельзя:
  // страница вместо игрока дала бы правилу допуска пустой рейтинг.
  if (/\/players\/[^/?]+$/.test(url)) {
    return reply(profile);
  }

  if (url.includes('/players')) {
    return reply(pageOf(found));
  }

  throw new Error(`Неожидаемый запрос: ${url}`);
}

function renderTournament(user: AuthUserView | null): void {
  useSessionStore.setState({
    user,
    accessToken: user === null ? null : 'token',
    isRestoring: false,
  });
  window.history.pushState({}, '', `/tournaments/${TOURNAMENT_ID}`);

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter({ queryClient, session: user });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  sent = [];
  tournament = openTournament();
  registrations = [];
  profile = PLAYERS.first;
  found = [PLAYERS.second];
  refusal = null;
  vi.stubGlobal('fetch', (input: unknown, init: RequestInit | undefined) =>
    Promise.resolve(answer(String(input), init)),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  useSessionStore.setState({ user: null, accessToken: null, isRestoring: false });
});

describe('условия допуска', () => {
  it('показываются до нажатия, а не всплывают отказом', async () => {
    tournament = { ...tournament, ratingCapMax: '400.00', maxParticipants: 16 };

    renderTournament(null);

    expect(await screen.findByText(ru['registration.ratingTo'])).toBeDefined();
    expect(screen.getByText('400.00')).toBeDefined();
    expect(screen.getByText(ru['registration.places'])).toBeDefined();
  });
});

describe('запись игрока', () => {
  it('гостю предлагает вход, а не кнопку, которая откажет', async () => {
    renderTournament(null);

    const link = await screen.findByRole('link', { name: ru['registration.signInToJoin'] });

    expect(link.getAttribute('href')).toContain('/login');
    expect(screen.queryByRole('button', { name: ru['registration.join'] })).toBeNull();
  });

  it('анкете без рейтинга — объяснение вместо кнопки (ADR-072)', async () => {
    profile = { ...PLAYERS.first, confirmed: false };

    renderTournament(USER_WITH_PROFILE);

    expect(await screen.findByText(new RegExp(ru['registration.unrated']))).toBeDefined();
    expect(
      screen.getByRole('link', { name: ru['registration.unrated.link'] }).getAttribute('href'),
    ).toBe('/settings/profile');
    expect(screen.queryByRole('button', { name: ru['registration.join'] })).toBeNull();
  });

  it('вошедшему без профиля предлагает кабинет', async () => {
    renderTournament(USER_WITHOUT_PROFILE);

    expect(await screen.findByText(ru['registration.profileRequired'])).toBeDefined();
    expect(screen.queryByRole('button', { name: ru['registration.join'] })).toBeNull();
  });

  it('записывает без указания игрока: человек записывает себя', async () => {
    renderTournament(USER_WITH_PROFILE);

    fireEvent.click(await screen.findByRole('button', { name: ru['registration.join'] }));

    await waitFor(() => {
      expect(sent.filter((request) => request.method === 'POST')).toHaveLength(1);
    });

    const [request] = sent.filter((row) => row.method === 'POST');

    // `playerId` в теле означал бы запись чужого человека, а это право
    // организатора клуба-хозяина (ADR-014).
    expect(request?.body).toEqual({});
    expect(request?.url).toContain(`/tournaments/${TOURNAMENT_ID}/registrations`);
  });

  it('гасит кнопку и называет причину до нажатия, а не после отказа', async () => {
    // Рейтинг игрока 520.00 против планки 400.00: сервер откажет наверняка.
    tournament = { ...tournament, ratingCapMax: '400.00' };

    renderTournament(USER_WITH_PROFILE);

    const button = await screen.findByRole('button', { name: ru['registration.join'] });

    expect(button.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(ru['registration.problem.RATING_TOO_HIGH'])).toBeDefined();

    fireEvent.click(button);

    // Правило считается тем же кодом, что и на сервере, поэтому спрашивать
    // его незачем: запроса нет вовсе.
    expect(sent.filter((request) => request.method === 'POST')).toHaveLength(0);
  });

  it('подходящему по условиям кнопку не гасит', async () => {
    // Планка та же, но игрок под неё проходит: 300.00 против 400.00.
    tournament = { ...tournament, ratingCapMax: '400.00' };
    profile = PLAYERS.fourth;

    renderTournament(USER_WITH_PROFILE);

    const button = await screen.findByRole('button', { name: ru['registration.join'] });

    expect(button.hasAttribute('disabled')).toBe(false);
    expect(screen.queryByText(ru['registration.problem.RATING_TOO_HIGH'])).toBeNull();
  });

  it('незаданная планка не превращается в ноль', async () => {
    // `Number(null)` — ноль, и планка «не ниже нуля» отсекла бы всех, у кого
    // рейтинг ниже. У фикстуры планок нет: запись обязана пройти.
    renderTournament(USER_WITH_PROFILE);

    const button = await screen.findByRole('button', { name: ru['registration.join'] });

    expect(button.hasAttribute('disabled')).toBe(false);
  });

  it('называет причины недопуска, а не общий текст проверки схемы', async () => {
    refusal = {
      code: 'VALIDATION_FAILED',
      details: { problems: ['RATING_TOO_HIGH', 'GENDER_NOT_ALLOWED'] },
    };

    renderTournament(USER_WITH_PROFILE);

    fireEvent.click(await screen.findByRole('button', { name: ru['registration.join'] }));

    // Все причины сразу: узнавать о следующей после устранения предыдущей
    // человек не должен.
    expect(await screen.findByText(ru['registration.problem.RATING_TOO_HIGH'])).toBeDefined();
    expect(screen.getByText(ru['registration.problem.GENDER_NOT_ALLOWED'])).toBeDefined();
    expect(screen.queryByText(ru['error.api.VALIDATION_FAILED'])).toBeNull();
  });

  it('записанному показывает состояние и даёт отменить', async () => {
    registrations = REGISTRATIONS;

    renderTournament(USER_WITH_PROFILE);

    expect(await screen.findByText(ru['registration.joined'])).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: ru['registration.cancel'] }));

    await waitFor(() => {
      expect(sent.some((request) => request.method === 'DELETE')).toBe(true);
    });
  });

  it('лист ожидания назван листом ожидания', async () => {
    registrations = [{ ...OWN_REGISTRATION, status: 'WAITLIST' }];

    renderTournament(USER_WITH_PROFILE);

    expect(await screen.findByText(ru['registration.waitlisted'])).toBeDefined();
  });
});

describe('заявки вне рейтинга — ADR-044', () => {
  it('игрок вне планки подаёт заявку, если турнир их принимает', async () => {
    // Рейтинг 520.00 против планки 400.00 — вне планки, но рассмотрение включено.
    tournament = { ...tournament, ratingCapMax: '400.00', reviewOutOfRating: true };

    renderTournament(USER_WITH_PROFILE);

    const button = await screen.findByRole('button', { name: ru['registration.apply'] });

    expect(button.hasAttribute('disabled')).toBe(false);
    expect(screen.getByText(ru['registration.problem.RATING_TOO_HIGH'])).toBeDefined();

    fireEvent.click(button);

    await waitFor(() => {
      expect(sent.filter((request) => request.method === 'POST')).toHaveLength(1);
    });
  });

  it('пол заявкой не переступить: кнопка погашена, как и без рассмотрения', async () => {
    tournament = { ...tournament, genderLimit: 'FEMALE', reviewOutOfRating: true };

    renderTournament(USER_WITH_PROFILE);

    const button = await screen.findByRole('button', { name: ru['registration.join'] });

    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('организатор видит заявку отдельно от состава и принимает её', async () => {
    const [first] = REGISTRATIONS;

    if (first === undefined) throw new Error('Нет участника в фикстуре');
    registrations = [{ ...first, status: 'PENDING' }];

    renderTournament(USER_WITH_PROFILE);

    expect(await screen.findByText(ru['participants.applications'])).toBeDefined();
    // Заявка ещё не участник: в составе её нет.
    expect(screen.queryByRole('button', { name: ru['participants.withdraw'] })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: ru['participants.accept'] }));

    await waitFor(() => {
      expect(sent.find((request) => request.method === 'PATCH')?.body).toEqual({
        status: 'CONFIRMED',
      });
    });
  });
});

describe('панель организатора', () => {
  it('игроку без роли в клубе органов управления не показывает', async () => {
    registrations = REGISTRATIONS;

    renderTournament({ ...USER_WITH_PROFILE, clubRoles: [] });

    expect(await screen.findByText(ru['participants.title'])).toBeDefined();
    expect(screen.queryByRole('button', { name: ru['participants.withdraw'] })).toBeNull();
  });

  it('организатор снимает участника', async () => {
    registrations = REGISTRATIONS;

    renderTournament(USER_WITH_PROFILE);

    // Кнопка у каждого участника своя: снимаем первого.
    const [withdraw] = await screen.findAllByRole('button', {
      name: ru['participants.withdraw'],
    });

    if (withdraw === undefined) {
      throw new Error('Кнопка снятия не найдена');
    }

    fireEvent.click(withdraw);

    await waitFor(() => {
      expect(sent.some((request) => request.method === 'PATCH')).toBe(true);
    });

    const [request] = sent.filter((row) => row.method === 'PATCH');

    expect(request?.body).toEqual({ status: 'WITHDRAWN' });
  });

  it('организатор находит игрока и записывает его указанием playerId', async () => {
    renderTournament(USER_WITH_PROFILE);

    fireEvent.change(await screen.findByLabelText(ru['participants.search']), {
      target: { value: 'Смагулов' },
    });
    fireEvent.click(screen.getByRole('button', { name: ru['participants.find'] }));

    fireEvent.click(await screen.findByRole('button', { name: ru['participants.add'] }));

    await waitFor(() => {
      expect(sent.some((request) => request.method === 'POST')).toBe(true);
    });

    const [request] = sent.filter((row) => row.method === 'POST');

    expect(request?.body).toEqual({ playerId: PLAYERS.second.id });
  });

  it('пришедшему с анкетой организатор задаёт рейтинг по уровню и записывает (ADR-072)', async () => {
    found = [{ ...PLAYERS.second, confirmed: false }];

    renderTournament(USER_WITH_PROFILE);

    fireEvent.change(await screen.findByLabelText(ru['participants.search']), {
      target: { value: 'Смагулов' },
    });
    fireEvent.click(screen.getByRole('button', { name: ru['participants.find'] }));

    // В поиск организатора анкеты попадают — по флагу запроса.
    await screen.findByText(new RegExp(ru['participants.sheet']));
    expect(sent.some((request) => request.url.includes('withUnconfirmed=true'))).toBe(true);
    expect(screen.queryByRole('button', { name: ru['participants.add'] })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: ru['participants.confirm.open'] }));
    const submit = screen.getByRole('button', { name: ru['participants.confirm.submit'] });
    expect(submit.hasAttribute('disabled')).toBe(true);

    fireEvent.mouseDown(
      screen.getByRole('combobox', { name: new RegExp(ru['participants.new.rating']) }),
    );
    fireEvent.click(await screen.findByRole('option', { name: '400' }));
    fireEvent.click(submit);

    await waitFor(() => {
      expect(sent.filter((row) => row.method === 'POST')).toHaveLength(2);
    });
    const [confirm, register] = sent.filter((row) => row.method === 'POST');

    expect(confirm?.url).toContain(`/players/${PLAYERS.second.id}/confirm`);
    expect(confirm?.body).toEqual({ clubId: TOURNAMENT.clubId, startRating: 400 });
    expect(register?.body).toEqual({ playerId: PLAYERS.second.id });
  });

  it('найденный уже записанный игрок не предлагается повторно', async () => {
    registrations = [{ ...OWN_REGISTRATION, player: PLAYERS.second }];

    renderTournament(USER_WITH_PROFILE);

    fireEvent.change(await screen.findByLabelText(ru['participants.search']), {
      target: { value: 'Смагулов' },
    });
    fireEvent.click(screen.getByRole('button', { name: ru['participants.find'] }));

    // Кнопка, которая всегда откажет, — ложное обещание: записать дважды
    // сервер не даст.
    expect(await screen.findByText(ru['ratings.empty'])).toBeDefined();
    expect(screen.queryByRole('button', { name: ru['participants.add'] })).toBeNull();
  });

  it('организатор повторяет турнир, меняя только дату', async () => {
    // ТЗ 4.2 требует этот механизм: клуб проводит турнир восемь раз в месяц
    // с теми же настройками. Копирует сервер — форма их не пересобирает.
    renderTournament(USER_WITH_PROFILE);

    // Поле выбора разбито на секции; скрытое поле под ними принимает дату
    // строкой в формате языка интерфейса.
    const [field] = (await screen.findAllByLabelText(ru['tournament.form.startsAt'])).filter(
      (node) => node instanceof HTMLInputElement,
    );

    if (field === undefined) {
      throw new Error('Поле даты начала не найдено');
    }

    fireEvent.change(field, { target: { value: '01.12.2026 10:00' } });
    fireEvent.click(screen.getByRole('button', { name: ru['tournament.repeat.submit'] }));

    await waitFor(() => {
      expect(sent.some((request) => request.url.includes('/duplicate'))).toBe(true);
    });

    const [request] = sent.filter((row) => row.url.includes('/duplicate'));

    expect(request?.body).toEqual({ startsAt: new Date('2026-12-01T10:00').toISOString() });
  });

  it('игроку без роли в клубе повторение не предлагается', async () => {
    renderTournament({ ...USER_WITH_PROFILE, clubRoles: [] });

    await screen.findByText(ru['registration.title']);

    expect(screen.queryByRole('button', { name: ru['tournament.repeat.submit'] })).toBeNull();
  });

  it('состав ведёт на профиль каждого участника', async () => {
    registrations = REGISTRATIONS;

    renderTournament(null);

    const link = await screen.findByRole('link', { name: playerName(PLAYERS.first) });

    expect(link.getAttribute('href')).toBe(`/players/${PLAYERS.first.id}`);
  });
});

describe('тренер на турнире — ADR-059, T3', () => {
  const COACHED: RegistrationView = {
    ...OWN_REGISTRATION,
    coach: { playerId: PLAYERS.second.id, name: 'Ким Ольга', slug: 'kim' },
  };

  /** Строка «Тренер на турнире» в своей записи. */
  async function ownCoach(): Promise<HTMLElement> {
    const label = await screen.findByText(ru['registration.coach.label'], { exact: false });
    const line = label.closest<HTMLElement>('[data-own-coach]');

    if (line === null) throw new Error('Строка тренера в записи не найдена');
    return line;
  }

  const coachRequests = (): Sent[] =>
    sent.filter((request) => request.method === 'PUT' && request.url.endsWith('/coach'));

  it('записанный видит тренера ссылкой и вписывает другого — уходит PUT', async () => {
    registrations = [COACHED];

    renderTournament({ ...USER_WITH_PROFILE, clubRoles: [] });

    const line = await ownCoach();
    expect(within(line).getByRole('link', { name: 'Ким Ольга' }).getAttribute('href')).toBe(
      '/coaches/kim',
    );
    expect(within(line).getByText(ru['registration.coach.hint'])).toBeDefined();

    fireEvent.click(within(line).getByRole('button', { name: ru['registration.coach.edit'] }));

    const dialog = await screen.findByRole('dialog');
    const input = within(dialog).getByRole('combobox', { name: ru['player.form.coachFind'] });
    // Поле начинается с тренера записи.
    expect((input as HTMLInputElement).value).toBe('Ким Ольга');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Сериков Тимур' } });
    fireEvent.click(
      await screen.findByText(fill(ru['player.form.coachTyped'], { name: 'Сериков Тимур' })),
    );
    fireEvent.click(within(dialog).getByRole('button', { name: ru['registration.coach.save'] }));

    await waitFor(() => {
      expect(coachRequests()).toHaveLength(1);
    });
    const [request] = coachRequests();
    expect(request?.url).toContain(
      `/tournaments/${TOURNAMENT_ID}/registrations/${OWN_REGISTRATION.id}/coach`,
    );
    expect(request?.body).toEqual({ coachPlayerId: null, coachName: 'Сериков Тимур' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('без тренера — «Тренер не указан»', async () => {
    registrations = [OWN_REGISTRATION];

    renderTournament({ ...USER_WITH_PROFILE, clubRoles: [] });

    expect(await screen.findByText(ru['registration.coach.none'])).toBeDefined();
    expect(screen.getByRole('button', { name: ru['registration.coach.edit'] })).toBeDefined();
  });

  it('организатор убирает тренера у участника — оба поля null', async () => {
    registrations = [COACHED];

    renderTournament(USER_WITH_PROFILE);

    const [edit] = await screen.findAllByRole('button', { name: ru['participants.editCoach'] });
    if (edit === undefined) throw new Error('Кнопка тренера в составе не найдена');
    fireEvent.click(edit);

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByLabelText(ru['player.form.coachClear']));
    fireEvent.click(within(dialog).getByRole('button', { name: ru['registration.coach.save'] }));

    await waitFor(() => {
      expect(coachRequests()).toHaveLength(1);
    });
    expect(coachRequests()[0]?.body).toEqual({ coachPlayerId: null, coachName: null });
  });

  it('после старта тренер виден, но не правится ни игроком, ни организатором', async () => {
    tournament = { ...tournament, status: 'RUNNING', startedAt: new Date().toISOString() };
    registrations = [COACHED];

    renderTournament(USER_WITH_PROFILE);

    const line = await ownCoach();
    expect(within(line).getByRole('link', { name: 'Ким Ольга' })).toBeDefined();
    expect(within(line).queryByText(ru['registration.coach.hint'])).toBeNull();
    expect(screen.queryByRole('button', { name: ru['registration.coach.edit'] })).toBeNull();
    expect(screen.queryByRole('button', { name: ru['participants.editCoach'] })).toBeNull();
  });

  it('состав: «тренер X» у участника, ссылкой — только со страницей тренера', async () => {
    const [, second] = REGISTRATIONS;

    if (second === undefined) throw new Error('Нет второго участника в фикстуре');
    registrations = [
      COACHED,
      { ...second, coach: { playerId: null, name: 'Сериков Тимур', slug: null } },
    ];

    renderTournament(null);

    const link = await screen.findByRole('link', { name: 'Ким Ольга' });
    expect(link.getAttribute('href')).toBe('/coaches/kim');
    expect(link.closest('[data-registration-coach]')?.textContent).toBe(
      `${ru['participants.coach']} Ким Ольга`,
    );

    const typed = screen.getByText('Сериков Тимур', { exact: false });
    expect(typed.closest('[data-registration-coach]')).not.toBeNull();
    expect(screen.queryByRole('link', { name: 'Сериков Тимур' })).toBeNull();
    // Гостю править нечего.
    expect(screen.queryByRole('button', { name: ru['participants.editCoach'] })).toBeNull();
  });
});
