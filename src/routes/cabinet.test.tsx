import type { AuthUserView, PlayerProfileView, TournamentView } from '@kttf/shared/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { formatRating } from '@/common/i18n';
import { ru } from '@/common/i18n/ru';
import { useSessionStore } from '@/features/auth/session-store';
import { playerName } from '@/features/players/player-name';
import {
  ADMIN_USER,
  CITIES,
  CLUB,
  pageOf,
  placesReply,
  PLAYER_PROFILE,
  PLAYERS,
  RATING_HISTORY,
  TOURNAMENT,
  USER_WITH_PROFILE,
  USER_WITHOUT_PROFILE,
} from '@/test/fixtures';

/**
 * Кабинет и настройки — ТЗ 2.1, 2.2, ADR-048.
 *
 * Кабинет — рабочий стол по ролям; анкета игрока и аккаунт — в «Настройках»,
 * каждый на своём адресе. Стережётся связка целиком: форма, тело запроса по
 * контракту ТС 7.2, появление профиля в сессии без повторного входа и то,
 * что каждой роли кабинет показывает своё.
 */

interface Sent {
  readonly url: string;
  readonly method: string;
  readonly body: unknown;
}

let sent: Sent[] = [];
/** Кого отдаёт `/auth/me`: после заведения профиля — уже с `playerId`. */
let me: AuthUserView = USER_WITH_PROFILE;
/** Профиль, которым отвечает `/players`. */
let profile: PlayerProfileView = PLAYER_PROFILE;
/** Турниры клуба — по `clubId`; турниры, куда записан игрок, — по `playerId`. */
let clubTournaments: TournamentView[] = [];
let myTournaments: TournamentView[] = [];

const SUMMARY = {
  playerId: PLAYERS.first.id,
  rank: 3,
  rankedPlayers: 40,
  maxRating: PLAYERS.first.rating,
  period: 'ALL',
  tournaments: 1,
  wins: 2,
  losses: 1,
  firstTournament: null,
  favoriteClub: null,
  bestWins: [],
  awards: [],
};

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

  sent.push({
    url,
    method,
    body: typeof raw === 'string' ? JSON.parse(raw) : undefined,
  });

  const places = placesReply(url);
  if (places !== undefined) {
    return reply(places);
  }

  if (url.includes('/auth/change-password')) {
    return reply({ accessToken: 'new-access', refreshToken: 'new-refresh' });
  }

  if (url.includes('/auth/me')) {
    return reply(me);
  }

  if (url.includes('/tournaments?')) {
    return reply(pageOf(url.includes('playerId=') ? myTournaments : clubTournaments));
  }

  if (url.includes('/admin/club-applications')) {
    return reply(pageOf([]));
  }

  if (url.includes('/rating-history')) {
    return reply(RATING_HISTORY);
  }

  if (url.includes('/summary')) {
    return reply(SUMMARY);
  }

  if (url.includes('/players/') && url.includes('/tournaments')) {
    return reply(pageOf([]));
  }

  if (url.includes('/clubs')) {
    return reply(pageOf([CLUB]));
  }

  if (url.includes('/players')) {
    // И создание, и правка, и чтение отвечают полным профилем — ТС 7.2.
    return reply(profile);
  }

  throw new Error(`Неожидаемый запрос: ${url}`);
}

/** Страницы под проверкой: кабинет и два раздела настроек. */
const CABINET = '/cabinet';
const PROFILE = '/settings/profile';
const ACCOUNT = '/settings/account';

function renderAt(path: string, user: AuthUserView): void {
  useSessionStore.setState({ user, accessToken: 'access-token', isRestoring: false });
  window.history.pushState({}, '', path);

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter({ queryClient, session: user });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

/** Заполнение обязательных полей ТЗ 2.2. */
async function fillRequired(): Promise<void> {
  fireEvent.change(screen.getByLabelText(ru['player.form.lastName']), {
    target: { value: 'Ержанов' },
  });
  fireEvent.change(screen.getByLabelText(ru['player.form.firstName']), {
    target: { value: 'Асан' },
  });
  // Год выводится из даты: отдельного поля года в форме нет (ADR-037).
  // Поле даты MUI подписано и группой секций, и скрытым вводом; значение
  // принимает ввод, в формате поля — день, месяц, год.
  const birthDate = screen
    .getAllByLabelText(new RegExp(ru['player.form.birthDate']))
    .find((element): element is HTMLInputElement => element instanceof HTMLInputElement);
  if (birthDate === undefined) {
    throw new Error('Нет поля даты рождения');
  }
  fireEvent.change(birthDate, { target: { value: '12.04.2000' } });
  // Список MUI открывается нажатием, а не сменой значения родного select.
  fireEvent.mouseDown(screen.getByRole('combobox', { name: ru['player.form.gender'] }));
  fireEvent.click(screen.getByRole('option', { name: ru['player.gender.MALE'] }));
  // Город выбирается из справочника, а не набирается (ADR-046).
  await chooseCity(CITIES.almaty.name);
}

/** Выбор города: список с поиском открывается нажатием на поле. */
async function chooseCity(name: string): Promise<void> {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: ru['player.form.city'] }));
  fireEvent.click(await screen.findByRole('option', { name }));
}

function submit(name: string): void {
  fireEvent.click(screen.getByRole('button', { name }));
}

function requests(method: string): Sent[] {
  return sent.filter((request) => request.method === method);
}

beforeEach(() => {
  sent = [];
  me = USER_WITH_PROFILE;
  profile = PLAYER_PROFILE;
  clubTournaments = [];
  myTournaments = [];
  vi.stubGlobal('fetch', (input: unknown, init: RequestInit | undefined) =>
    Promise.resolve(answer(String(input), init)),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  useSessionStore.setState({ user: null, accessToken: null, isRestoring: false });
});

describe('профиль при регистрации', () => {
  it('без профиля настройки предлагают его завести', async () => {
    renderAt(PROFILE, USER_WITHOUT_PROFILE);

    expect(await screen.findByText(ru['cabinet.profile.lead'])).toBeDefined();
    expect(screen.getByLabelText(ru['player.form.lastName'])).toBeDefined();
  });

  it('отправляет профиль телом по контракту', async () => {
    renderAt(PROFILE, USER_WITHOUT_PROFILE);

    await screen.findByText(ru['cabinet.profile.lead']);
    await fillRequired();
    submit(ru['cabinet.profile.create']);

    await waitFor(() => {
      expect(requests('POST')).toHaveLength(1);
    });

    const [request] = requests('POST');

    expect(request?.url).toContain('/players');
    expect(request?.body).toEqual({
      lastName: 'Ержанов',
      firstName: 'Асан',
      // Числом, а не строкой из поля ввода: схема ждёт число.
      birthYear: 2000,
      birthDate: '2000-04-12',
      birthYearOnly: true,
      gender: 'MALE',
      cityId: CITIES.almaty.id,
    });
  });

  it('незаполненное обязательное поле не уходит на сервер', async () => {
    renderAt(PROFILE, USER_WITHOUT_PROFILE);

    await screen.findByText(ru['cabinet.profile.lead']);
    submit(ru['cabinet.profile.create']);

    // Названы все пять обязательных полей ТЗ 2.2, а не первое встреченное.
    expect(await screen.findAllByRole('alert')).toHaveLength(5);
    expect(requests('POST')).toHaveLength(0);
  });

  it('после заведения профиль появляется без повторного входа', async () => {
    renderAt(PROFILE, USER_WITHOUT_PROFILE);

    await screen.findByText(ru['cabinet.profile.lead']);
    await fillRequired();
    submit(ru['cabinet.profile.create']);

    // `playerId` пришёл перечитанным пользователем, а не выведен из ответа:
    // состав сессии задаёт ТС 7.1, и собирать его на клиенте нельзя.
    // После заведения — на свой публичный профиль.
    expect(
      await screen.findByRole(
        'heading',
        { name: playerName(PLAYERS.first), level: 1 },
        { timeout: 5000 },
      ),
    ).toBeDefined();
    expect(sent.some((request) => request.url.includes('/auth/me'))).toBe(true);
  });
});

describe('шапка вошедшего — ADR-048', () => {
  it('имя и рейтинг вместо слова «Кабинет», меню ведёт на публичный профиль', async () => {
    renderAt(CABINET, USER_WITH_PROFILE);

    const account = await screen.findByRole('button', { name: ru['nav.account'] });
    await waitFor(() => {
      expect(account.textContent).toContain(formatRating(PLAYERS.first.rating));
    });

    fireEvent.click(account);

    const profile = await screen.findByRole('menuitem', { name: ru['nav.myProfile'] });
    expect(profile.getAttribute('href')).toBe(`/players/${PLAYERS.first.id}`);
    // Роль в клубе есть — «Мои клубы» в меню.
    expect(screen.getByRole('menuitem', { name: ru['nav.myClubs'] })).toBeDefined();
    expect(screen.getByRole('menuitem', { name: ru['nav.settings'] })).toBeDefined();
  });

  it('без профиля — создать его, без клубов — пункта «Мои клубы» нет', async () => {
    renderAt(CABINET, USER_WITHOUT_PROFILE);

    fireEvent.click(await screen.findByRole('button', { name: ru['nav.account'] }));

    expect(await screen.findByRole('menuitem', { name: ru['nav.createProfile'] })).toBeDefined();
    expect(screen.queryByRole('menuitem', { name: ru['nav.myClubs'] })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: ru['nav.admin'] })).toBeNull();
  });
});

describe('свой профиль в настройках', () => {
  it('форма открывается сразу заполненной, правка уходит методом PATCH', async () => {
    renderAt(PROFILE, USER_WITH_PROFILE);

    const city = await screen.findByRole('combobox', { name: ru['player.form.city'] });

    // Форма открывается заполненной: правка не заставляет вводить всё заново.
    expect((city as HTMLInputElement).value).toBe(PLAYERS.first.city.name);

    await chooseCity(CITIES.astana.name);
    submit(ru['cabinet.profile.save']);

    await waitFor(() => {
      expect(requests('PATCH')).toHaveLength(1);
    });

    const [request] = requests('PATCH');

    expect(request?.url).toContain(`/players/${PLAYERS.first.id}`);
    expect(request?.body).toMatchObject({
      cityId: CITIES.astana.id,
      lastName: PLAYERS.first.lastName,
    });
    // После сохранения — на свой публичный профиль: результат так, как его
    // увидят другие.
    expect(
      await screen.findByRole('heading', { name: playerName(PLAYERS.first), level: 1 }),
    ).toBeDefined();
  });

  it('скрытый город профиля остаётся выбранным, хотя в списке его нет', async () => {
    const hidden = { id: '00000000-0000-4000-8000-0000000000c9', name: 'Байконур', nameKk: null };
    profile = { ...PLAYER_PROFILE, city: hidden };
    renderAt(PROFILE, USER_WITH_PROFILE);

    const city = await screen.findByRole('combobox', { name: ru['player.form.city'] });

    expect((city as HTMLInputElement).value).toBe('Байконур');
    expect(await screen.findByText(ru['places.city.hidden'])).toBeDefined();

    // Не тронутый город уходит прежним: сервер оставит его тому, у кого он уже есть.
    submit(ru['cabinet.profile.save']);
    await waitFor(() => {
      expect(requests('PATCH')).toHaveLength(1);
    });
    expect(requests('PATCH')[0]?.body).toMatchObject({ cityId: hidden.id });
  });

  it('аккаунта на странице профиля нет — он в своём разделе', async () => {
    renderAt(PROFILE, USER_WITH_PROFILE);

    await screen.findByRole('combobox', { name: ru['player.form.city'] });

    expect(screen.queryByLabelText(ru['account.form.login'])).toBeNull();
    expect(screen.queryByLabelText(ru['account.password.current'])).toBeNull();
  });
});

describe('кабинет — рабочий стол', () => {
  it('без профиля первым делом предлагает его создать', async () => {
    renderAt(CABINET, USER_WITHOUT_PROFILE);

    const create = await screen.findByRole('link', { name: ru['cabinet.noProfile.action'] });

    expect(create.getAttribute('href')).toBe(PROFILE);
  });

  it('владельцу — клуб с ролью словом и созданием турнира', async () => {
    renderAt(CABINET, USER_WITH_PROFILE);

    expect(await screen.findByText(new RegExp(ru['club.role.OWNER']))).toBeDefined();

    const create = await screen.findByRole('link', { name: ru['tournament.form.create'] });
    expect(create.getAttribute('href')).toContain(`club=${CLUB.id}`);
  });

  it('идущий турнир клуба — с кнопкой консоли', async () => {
    clubTournaments = [{ ...TOURNAMENT, status: 'RUNNING' }];

    renderAt(CABINET, USER_WITH_PROFILE);

    const console = await screen.findByRole('link', { name: ru['manage.console'] });
    expect(console.getAttribute('href')).toBe(`/console/${TOURNAMENT.id}`);
  });

  it('игроку — рейтинг с местом и турниры, куда он записан', async () => {
    myTournaments = [{ ...TOURNAMENT, status: 'REG_OPEN' }];

    renderAt(CABINET, USER_WITH_PROFILE);

    expect(await screen.findByText(/3 место в стране из 40/)).toBeDefined();
    // Название турнира есть и в «Моих турнирах», и у последнего изменения рейтинга.
    expect((await screen.findAllByText(TOURNAMENT.name)).length).toBeGreaterThan(1);
    expect(sent.some((request) => request.url.includes(`playerId=${PLAYERS.first.id}`))).toBe(true);
  });

  it('анкеты и аккаунта в кабинете нет', async () => {
    renderAt(CABINET, USER_WITH_PROFILE);

    await screen.findByText(ru['cabinet.player.title']);

    expect(screen.queryByLabelText(ru['account.form.login'])).toBeNull();
    expect(screen.queryByLabelText(ru['player.form.lastName'])).toBeNull();
  });
});

describe('настройки аккаунта', () => {
  it('логин и почта уходят на /auth/me, а не в профиль игрока', async () => {
    renderAt(ACCOUNT, USER_WITH_PROFILE);

    fireEvent.change(await screen.findByLabelText(ru['account.form.login']), {
      target: { value: 'znewk' },
    });
    fireEvent.change(screen.getByLabelText(new RegExp(ru['account.form.email'])), {
      target: { value: 'zane@example.kz' },
    });
    submit(ru['account.form.save']);

    await waitFor(() => {
      expect(requests('PATCH')).toHaveLength(1);
    });

    const [request] = requests('PATCH');

    expect(request?.url).toContain('/auth/me');
    expect(request?.body).toMatchObject({ login: 'znewk', email: 'zane@example.kz' });
  });

  it('стёртая почта уходит как null, иначе убрать её было бы нечем', async () => {
    me = { ...USER_WITH_PROFILE, email: 'zane@example.kz' };
    renderAt(ACCOUNT, me);

    fireEvent.change(await screen.findByLabelText(new RegExp(ru['account.form.email'])), {
      target: { value: '' },
    });
    submit(ru['account.form.save']);

    await waitFor(() => {
      expect(requests('PATCH')).toHaveLength(1);
    });

    expect((requests('PATCH')[0]?.body as { email: unknown }).email).toBeNull();
  });

  it('телефон в форму не выведен: он меняется через поддержку', async () => {
    renderAt(ACCOUNT, USER_WITH_PROFILE);

    await screen.findByLabelText(ru['account.form.login']);

    expect(screen.queryByLabelText(ru['cabinet.account.phone'])).toBeNull();
    expect(screen.getByText(USER_WITH_PROFILE.phone)).toBeDefined();
  });
});

describe('смена пароля', () => {
  it('уходит отдельным маршрутом и заменяет токены', async () => {
    renderAt(ACCOUNT, USER_WITH_PROFILE);

    fireEvent.change(await screen.findByLabelText(ru['account.password.current']), {
      target: { value: 'staryj-parol' },
    });
    fireEvent.change(screen.getByLabelText(ru['account.password.next']), {
      target: { value: 'novyj-parol' },
    });
    submit(ru['account.password.submit']);

    await waitFor(() => {
      expect(requests('POST')).toHaveLength(1);
    });

    expect(requests('POST')[0]?.url).toContain('/auth/change-password');
    // Сервер обрывает остальные сессии: без замены токенов вкладка, из
    // которой меняли пароль, умерла бы вместе с ними.
    expect(useSessionStore.getState().accessToken).toBe('new-access');
  });

  it('короткий новый пароль на сервер не уходит', async () => {
    renderAt(ACCOUNT, USER_WITH_PROFILE);

    fireEvent.change(await screen.findByLabelText(ru['account.password.current']), {
      target: { value: 'staryj-parol' },
    });
    fireEvent.change(screen.getByLabelText(ru['account.password.next']), {
      target: { value: 'korot' },
    });
    submit(ru['account.password.submit']);

    expect(await screen.findByText(ru['error.form.password'])).toBeDefined();
    expect(requests('POST')).toHaveLength(0);
  });
});

/**
 * Дата рождения — ADR-037.
 *
 * Поле одно: год выводится из даты. Спрашивать дважды об одном и том же,
 * да ещё и отказывать за расхождение, — работа, переложенная на человека.
 */
describe('дата рождения', () => {
  it('отдельного поля года в форме нет', async () => {
    renderAt(PROFILE, USER_WITHOUT_PROFILE);

    await screen.findByText(ru['cabinet.profile.lead']);

    expect(screen.queryByLabelText(ru['player.form.birthYear'])).toBeNull();
    expect(
      screen.getByRole('group', { name: new RegExp(ru['player.form.birthDate']) }),
    ).toBeDefined();
  });

  it('год уходит на сервер выведенным из даты', async () => {
    renderAt(PROFILE, USER_WITHOUT_PROFILE);

    await screen.findByText(ru['cabinet.profile.lead']);
    await fillRequired();
    submit(ru['cabinet.profile.create']);

    await waitFor(() => {
      expect(requests('POST')).toHaveLength(1);
    });

    expect(requests('POST')[0]?.body).toMatchObject({ birthYear: 2000, birthDate: '2000-04-12' });
  });

  it('без даты профиль не отправляется', async () => {
    renderAt(PROFILE, USER_WITHOUT_PROFILE);

    await screen.findByText(ru['cabinet.profile.lead']);
    submit(ru['cabinet.profile.create']);

    expect(await screen.findByText(ru['error.form.birthDate'])).toBeDefined();
    expect(requests('POST')).toHaveLength(0);
  });

  it('галочка приватности уходит вместе с профилем', async () => {
    renderAt(PROFILE, USER_WITH_PROFILE);

    fireEvent.click(await screen.findByLabelText(ru['player.form.birthYearOnly']));
    submit(ru['cabinet.profile.save']);

    await waitFor(() => {
      expect(requests('PATCH')).toHaveLength(1);
    });

    // Профиль приходит с включённой галочкой, нажатие её снимает.
    expect((requests('PATCH')[0]?.body as { birthYearOnly: unknown }).birthYearOnly).toBe(false);
  });
});

/** Раздел администратора — ADR-046. */
describe('справочник в кабинете', () => {
  it('администратору — ссылка на страны и города', async () => {
    renderAt(CABINET, ADMIN_USER);

    const link = await screen.findByRole('link', { name: ru['page.places.title'] });

    expect(link.getAttribute('href')).toBe('/cabinet/places');
  });

  it('остальным ссылки нет', async () => {
    renderAt(CABINET, USER_WITH_PROFILE);

    await screen.findByText(ru['cabinet.player.title']);

    expect(screen.queryByRole('link', { name: ru['page.places.title'] })).toBeNull();
  });
});

/** Клуб — только по заявке, и второй тоже — ADR-049. */
describe('мои клубы у владельца', () => {
  it('второй клуб или филиал — новой заявкой, а не своей кнопкой', async () => {
    renderAt('/cabinet/clubs', USER_WITH_PROFILE);

    expect(await screen.findByRole('heading', { name: ru['myClubs.more.title'] })).toBeDefined();
    const apply = screen.getAllByRole('link', { name: ru['clubs.apply'] });

    expect(apply.map((link) => link.getAttribute('href'))).toEqual(['/feedback']);
    expect(screen.queryByRole('link', { name: ru['club.create'] })).toBeNull();
  });

  it('администратору — заявки клубов, а не создание клуба', async () => {
    renderAt('/cabinet/clubs', { ...ADMIN_USER, clubRoles: USER_WITH_PROFILE.clubRoles });

    const applications = await screen.findByRole('link', { name: ru['page.applications.title'] });

    expect(applications.getAttribute('href')).toBe('/cabinet/applications');
    expect(screen.queryByRole('link', { name: ru['club.create'] })).toBeNull();
    expect(screen.queryByRole('heading', { name: ru['myClubs.more.title'] })).toBeNull();
  });

  it('администратору форма нового клуба без заявки не открывается', async () => {
    renderAt('/cabinet/clubs/new', ADMIN_USER);

    expect(await screen.findByText(ru['clubs.new.fromApplicationOnly.title'])).toBeDefined();
    expect(screen.queryByRole('button', { name: ru['club.create'] })).toBeNull();
  });
});
