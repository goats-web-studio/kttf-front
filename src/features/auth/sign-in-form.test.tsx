import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { ru } from '@/common/i18n/ru';

import { useSessionStore } from './session-store';

const PHONE = '+77011234567';

const SESSION = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  user: {
    id: '00000000-0000-4000-8000-000000000001',
    phone: PHONE,
    login: 'aslan',
    email: null,
    locale: 'ru',
    createdAt: '2026-08-30T00:00:00.000Z',
    playerId: null,
    clubRoles: [],
  },
};

function reply(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

/**
 * Форма открывается своей страницей: в ней есть ссылка на регистрацию, а
 * `Link` без роутера не отрисовывается.
 */
async function renderForm(): Promise<void> {
  window.history.pushState({}, '', '/login');

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter({ queryClient, session: null });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  // Маршрут отрисовывается не синхронно: без ожидания полей ещё нет.
  await screen.findByRole('button', { name: ru['login.submit'] });
}

function type(label: string, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function press(name: string): void {
  fireEvent.click(screen.getByRole('button', { name }));
}

beforeEach(() => {
  globalThis.localStorage.clear();
  useSessionStore.setState({ user: null, accessToken: null, isRestoring: false });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('форма входа', () => {
  it('пустые поля на сервер не уходят, ошибка — у каждого поля', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    await renderForm();
    press(ru['login.submit']);

    // Тексты — из словаря, а не из схемы: сообщения схем не локализуются (бриф 3.4).
    expect(await screen.findByText(ru['error.form.phone'])).toBeDefined();
    expect(screen.getByText(ru['error.form.passwordEmpty'])).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('телефон набирается маской и уходит на сервер как +7XXXXXXXXXX', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(reply(200, SESSION));
    vi.stubGlobal('fetch', fetchMock);

    await renderForm();
    type(ru['login.phone.label'], '8 701 123 45 67');
    // Код страны — слева, в поле — номер по маске страны.
    expect(screen.getByLabelText(ru['login.phone.label'])).toHaveProperty(
      'value',
      '(701) 123-45-67',
    );
    type(ru['login.password.label'], 'parol123');
    press(ru['login.submit']);

    await waitFor(() => {
      expect(useSessionStore.getState().user?.phone).toBe(PHONE);
    });
    expect(fetchMock.mock.calls[0]?.[0] as string).toContain('/auth/login');
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toMatchObject({
      identifier: PHONE,
    });
    expect(globalThis.localStorage.getItem('kttf.refresh-token')).toBe('refresh-1');
  });

  it('неполный номер не уходит на сервер', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    await renderForm();
    type(ru['login.phone.label'], '701 123');
    type(ru['login.password.label'], 'parol123');
    press(ru['login.submit']);

    expect(await screen.findByText(ru['error.form.phone'])).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('вход по логину — своей вкладкой, и способ запоминается', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(reply(200, SESSION));
    vi.stubGlobal('fetch', fetchMock);

    await renderForm();
    fireEvent.click(screen.getByRole('radio', { name: ru['login.method.login'] }));
    type(ru['login.login.label'], 'aslan');
    type(ru['login.password.label'], 'parol123');
    press(ru['login.submit']);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toMatchObject({
      identifier: 'aslan',
    });
    expect(globalThis.localStorage.getItem('kttf.login-method')).toBe('login');
  });

  it('отказ сервера показывается на языке интерфейса', async () => {
    // Английский `message` сервера пользователю не показывается никогда.
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          reply(401, { error: { code: 'UNAUTHORIZED', message: 'Login or password is wrong' } }),
        ),
    );

    await renderForm();
    type(ru['login.phone.label'], '+77011234567');
    type(ru['login.password.label'], 'ne-parol');
    press(ru['login.submit']);

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      ru['error.api.UNAUTHORIZED'],
    );
  });
});
