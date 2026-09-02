import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { ru } from '@/common/i18n/ru';
import { playerName } from '@/features/players/player-name';
import { PLAYERS, pageOf } from '@/test/fixtures';

import { useSessionStore } from './session-store';

/**
 * Регистрация — ТЗ 2.1, ADR-034.
 *
 * Главное здесь — привязка к игроку, заведённому тренером: без неё человек
 * заводит второй профиль, и его рейтинг разъезжается на два.
 */

const SESSION = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  user: {
    id: '00000000-0000-4000-8000-000000000001',
    phone: '+77011234567',
    login: 'aslan',
    email: null,
    locale: 'ru',
    createdAt: '2026-08-30T00:00:00.000Z',
    playerId: null,
    clubRoles: [],
  },
};

interface Sent {
  readonly url: string;
  readonly body: unknown;
}

let sent: Sent[] = [];

function reply(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

async function renderPage(): Promise<void> {
  window.history.pushState({}, '', '/sign-up');

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter({ queryClient, session: null });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  await screen.findByRole('button', { name: ru['signUp.submit'] });
}

function type(label: string, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillRequired(): void {
  type(ru['signUp.login.label'], 'aslan');
  type(ru['signUp.password.label'], 'parol123');
  type(ru['signUp.phone.label'], '+77011234567');
}

beforeEach(() => {
  sent = [];
  globalThis.localStorage.clear();
  useSessionStore.setState({ user: null, accessToken: null, isRestoring: false });

  vi.stubGlobal('fetch', (input: unknown, init: RequestInit | undefined) => {
    const url = String(input);
    const raw = init?.body;

    sent.push({ url, body: typeof raw === 'string' ? JSON.parse(raw) : undefined });

    if (url.includes('/players')) return Promise.resolve(reply(200, pageOf([PLAYERS.third])));

    return Promise.resolve(reply(201, SESSION));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  useSessionStore.setState({ user: null, accessToken: null, isRestoring: false });
});

describe('регистрация', () => {
  it('заводит аккаунт и сохраняет сессию', async () => {
    await renderPage();
    fillRequired();
    fireEvent.click(screen.getByRole('button', { name: ru['signUp.submit'] }));

    await waitFor(() => {
      expect(useSessionStore.getState().user?.login).toBe('aslan');
    });
    expect(sent.some((request) => request.url.endsWith('/auth/sign-up'))).toBe(true);
  });

  it('ищет только игроков без кабинета', async () => {
    await renderPage();

    fireEvent.change(screen.getByPlaceholderText(ru['signUp.player.search']), {
      target: { value: 'Тле' },
    });

    await waitFor(() => {
      expect(sent.some((request) => request.url.includes('withoutAccount=true'))).toBe(true);
    });
  });

  it('выбранный игрок уходит на сервер вместе с регистрацией', async () => {
    await renderPage();
    fillRequired();

    fireEvent.change(screen.getByPlaceholderText(ru['signUp.player.search']), {
      target: { value: 'Тле' },
    });

    const list = await screen.findByRole('list', { name: ru['signUp.player.title'] });
    fireEvent.click(
      within(list).getByRole('button', { name: new RegExp(playerName(PLAYERS.third)) }),
    );

    fireEvent.click(screen.getByRole('button', { name: ru['signUp.submit'] }));

    await waitFor(() => {
      const request = sent.find((current) => current.url.endsWith('/auth/sign-up'));
      expect(request?.body).toMatchObject({ playerId: PLAYERS.third.id });
    });
  });

  it('короткий пароль не уходит на сервер', async () => {
    await renderPage();
    type(ru['signUp.login.label'], 'aslan');
    type(ru['signUp.password.label'], 'korotk1');
    type(ru['signUp.phone.label'], '+77011234567');

    fireEvent.click(screen.getByRole('button', { name: ru['signUp.submit'] }));

    expect(await screen.findByText(ru['error.form.password'])).toBeDefined();
    expect(sent.some((request) => request.url.endsWith('/auth/sign-up'))).toBe(false);
  });
});
