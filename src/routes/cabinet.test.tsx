import type { AuthUserView } from '@kttf/shared/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { ru } from '@/common/i18n/ru';
import { useSessionStore } from '@/features/auth/session-store';
import { playerName } from '@/features/players/player-name';
import { CLUB, pageOf, PLAYERS, USER_WITH_PROFILE, USER_WITHOUT_PROFILE } from '@/test/fixtures';

/**
 * Кабинет: заведение профиля после регистрации — ТЗ 2.2.
 *
 * Проверяется то, ради чего страница существует: после входа `playerId` пуст,
 * и заполнить его во фронтенде было нечем. Стережётся связка целиком — форма,
 * тело запроса по контракту ТС 7.2 и появление профиля в сессии без
 * повторного входа.
 */

interface Sent {
  readonly url: string;
  readonly method: string;
  readonly body: unknown;
}

let sent: Sent[] = [];
/** Кого отдаёт `/auth/me`: после заведения профиля — уже с `playerId`. */
let me: AuthUserView = USER_WITH_PROFILE;

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

  if (url.includes('/auth/me')) {
    return reply(me);
  }

  if (url.includes('/clubs')) {
    return reply(pageOf([CLUB]));
  }

  if (url.includes('/players')) {
    // И создание, и правка, и чтение отвечают профилем — контракт ТС 7.2.
    return reply(PLAYERS.first);
  }

  throw new Error(`Неожидаемый запрос: ${url}`);
}

function renderCabinet(user: AuthUserView): void {
  useSessionStore.setState({ user, accessToken: 'access-token', isRestoring: false });
  window.history.pushState({}, '', '/cabinet');

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter({ queryClient, session: user });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

/** Заполнение обязательных полей ТЗ 2.2. */
function fillRequired(): void {
  fireEvent.change(screen.getByLabelText(ru['player.form.lastName']), {
    target: { value: 'Ержанов' },
  });
  fireEvent.change(screen.getByLabelText(ru['player.form.firstName']), {
    target: { value: 'Асан' },
  });
  fireEvent.change(screen.getByLabelText(ru['player.form.birthYear']), {
    target: { value: '2000' },
  });
  fireEvent.change(screen.getByLabelText(ru['player.form.gender']), {
    target: { value: 'MALE' },
  });
  fireEvent.change(screen.getByLabelText(ru['player.form.city']), {
    target: { value: 'Алматы' },
  });
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
  vi.stubGlobal('fetch', (input: unknown, init: RequestInit | undefined) =>
    Promise.resolve(answer(String(input), init)),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  useSessionStore.setState({ user: null, accessToken: null, isRestoring: false });
});

describe('профиль при регистрации', () => {
  it('без профиля кабинет предлагает его завести', async () => {
    renderCabinet(USER_WITHOUT_PROFILE);

    expect(await screen.findByText(ru['cabinet.profile.lead'])).toBeDefined();
    expect(screen.getByLabelText(ru['player.form.lastName'])).toBeDefined();
  });

  it('отправляет профиль телом по контракту', async () => {
    renderCabinet(USER_WITHOUT_PROFILE);

    await screen.findByText(ru['cabinet.profile.lead']);
    fillRequired();
    submit(ru['cabinet.profile.create']);

    await waitFor(() => {
      expect(requests('POST')).toHaveLength(1);
    });

    const [request] = requests('POST');

    expect(request?.url).toContain('/players');
    expect(request?.body).toEqual({
      lastName: 'Ержанов',
      firstName: 'Асан',
      // Числом, а не строкой из поля ввода: схема ждёт `number`.
      birthYear: 2000,
      gender: 'MALE',
      city: 'Алматы',
    });
  });

  it('незаполненное обязательное поле не уходит на сервер', async () => {
    renderCabinet(USER_WITHOUT_PROFILE);

    await screen.findByText(ru['cabinet.profile.lead']);
    submit(ru['cabinet.profile.create']);

    // Названы все пять обязательных полей ТЗ 2.2, а не первое встреченное.
    expect(await screen.findAllByRole('alert')).toHaveLength(5);
    expect(requests('POST')).toHaveLength(0);
  });

  it('после заведения профиль появляется без повторного входа', async () => {
    renderCabinet(USER_WITHOUT_PROFILE);

    await screen.findByText(ru['cabinet.profile.lead']);
    fillRequired();
    submit(ru['cabinet.profile.create']);

    // `playerId` пришёл перечитанным пользователем, а не выведен из ответа:
    // состав сессии задаёт ТС 7.1, и собирать его на клиенте нельзя.
    expect(await screen.findByText(playerName(PLAYERS.first))).toBeDefined();
    expect(sent.some((request) => request.url.includes('/auth/me'))).toBe(true);
  });
});

describe('свой профиль', () => {
  it('показывает карточку и ведёт на публичный профиль', async () => {
    renderCabinet(USER_WITH_PROFILE);

    expect(await screen.findByText(playerName(PLAYERS.first))).toBeDefined();

    const link = screen.getByRole('link', { name: ru['cabinet.profile.public'] });

    expect(link.getAttribute('href')).toBe(`/players/${PLAYERS.first.id}`);
  });

  it('правка уходит методом PATCH заполненной формой', async () => {
    renderCabinet(USER_WITH_PROFILE);

    fireEvent.click(await screen.findByRole('button', { name: ru['cabinet.profile.edit'] }));

    const city = await screen.findByLabelText(ru['player.form.city']);

    // Форма открывается заполненной: правка не заставляет вводить всё заново.
    expect((city as HTMLInputElement).value).toBe(PLAYERS.first.city);

    fireEvent.change(city, { target: { value: 'Астана' } });
    submit(ru['cabinet.profile.save']);

    await waitFor(() => {
      expect(requests('PATCH')).toHaveLength(1);
    });

    const [request] = requests('PATCH');

    expect(request?.url).toContain(`/players/${PLAYERS.first.id}`);
    expect(request?.body).toMatchObject({ city: 'Астана', lastName: PLAYERS.first.lastName });
  });

  it('называет роль в клубе словом, а не значением из базы', async () => {
    renderCabinet(USER_WITH_PROFILE);

    expect(await screen.findByText(new RegExp(ru['club.role.OWNER']))).toBeDefined();
  });
});
