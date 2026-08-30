import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ru } from '@/common/i18n/ru';

import { useSessionStore } from './session-store';
import SignInForm from './sign-in-form';

const PHONE = '+77011234567';

const SESSION = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  user: {
    id: '00000000-0000-4000-8000-000000000001',
    phone: PHONE,
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

function renderForm(): { onSignedIn: ReturnType<typeof vi.fn> } {
  const onSignedIn = vi.fn();

  render(
    <QueryClientProvider client={new QueryClient()}>
      <SignInForm onSignedIn={onSignedIn} />
    </QueryClientProvider>,
  );

  return { onSignedIn };
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
  it('неверный номер не уходит на сервер', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    renderForm();
    type(ru['login.phone.label'], '87011234567');
    press(ru['login.submit.requestCode']);

    // Текст берётся из словаря, а не из схемы: сообщения внутри схем общие
    // с сервером и не локализуются — бриф 3.4.
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', ru['error.form.phone']);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('телефон, затем код — и сессия сохранена', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(reply(202, { expiresInSeconds: 300 }))
        .mockResolvedValueOnce(reply(200, SESSION)),
    );

    const { onSignedIn } = renderForm();
    type(ru['login.phone.label'], PHONE);
    press(ru['login.submit.requestCode']);

    // Второй шаг показывает номер: человек должен видеть, куда ушёл код.
    expect(await screen.findByText(PHONE)).toBeDefined();

    type(ru['login.code.label'], '123456');
    press(ru['login.submit.verify']);

    await waitFor(() => {
      expect(useSessionStore.getState().user?.phone).toBe(PHONE);
    });
    expect(onSignedIn).toHaveBeenCalledOnce();
    expect(globalThis.localStorage.getItem('kttf.refresh-token')).toBe('refresh-1');
  });

  it('превышение лимита показывается на языке интерфейса', async () => {
    // ТС 8.3: пять запросов кода на телефон в час. Английский message
    // сервера пользователю не показывается никогда.
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(reply(429, { error: { code: 'RATE_LIMITED', message: 'too many' } })),
    );

    renderForm();
    type(ru['login.phone.label'], PHONE);
    press(ru['login.submit.requestCode']);

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      ru['error.api.RATE_LIMITED'],
    );
  });

  it('короткий код не уходит на сервер', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(reply(202, { expiresInSeconds: 300 }));
    vi.stubGlobal('fetch', fetchMock);

    renderForm();
    type(ru['login.phone.label'], PHONE);
    press(ru['login.submit.requestCode']);
    await screen.findByText(PHONE);

    type(ru['login.code.label'], '12345');
    press(ru['login.submit.verify']);

    expect(await screen.findByRole('alert')).toHaveProperty('textContent', ru['error.form.code']);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
