import type { AuthUserView } from '@kttf/shared/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { ru } from '@/common/i18n/ru';

import { useSessionStore } from './session-store';

/** Удаление аккаунта в настройках — ADR-092. */

const USER: AuthUserView = {
  id: '00000000-0000-4000-8000-000000000001',
  phone: '+77011234567',
  login: 'aslan',
  email: null,
  locale: 'ru',
  telegramId: null,
  createdAt: '2026-08-30T00:00:00.000Z',
  playerId: null,
  clubRoles: [],
  isAdmin: false,
  coach: null,
  privacyConsentAt: '2026-11-17T00:00:00.000Z',
  privacyConsentVersion: '2026-11-17',
  city: null,
};

let answer: { status: number; body: unknown } = { status: 204, body: null };
let deleteCalls: unknown[] = [];

function reply(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(status === 204 ? '' : JSON.stringify(body)),
  } as unknown as Response;
}

async function renderSettings(): Promise<ReturnType<typeof createAppRouter>> {
  window.history.pushState({}, '', '/settings/account');

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter({ queryClient, session: USER });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  await screen.findByRole('button', { name: ru['account.delete.open'] });

  return router;
}

async function openDialog(): Promise<HTMLElement> {
  fireEvent.click(screen.getByRole('button', { name: ru['account.delete.open'] }));

  return screen.findByRole('dialog');
}

beforeEach(() => {
  answer = { status: 204, body: null };
  deleteCalls = [];
  useSessionStore.setState({ user: USER, accessToken: 'access-1', isRestoring: false });

  vi.stubGlobal('fetch', (input: unknown, init: RequestInit | undefined) => {
    const url = String(input);

    if (url.includes('/auth/delete-account')) {
      deleteCalls.push(typeof init?.body === 'string' ? JSON.parse(init.body) : undefined);
      return Promise.resolve(reply(answer.status, answer.body));
    }

    // Справочник для «Моего города» на той же странице (ADR-093).
    if (url.includes('/countries') || url.includes('/cities')) {
      return Promise.resolve(reply(200, []));
    }

    return Promise.resolve(reply(200, USER));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  useSessionStore.setState({ user: null, accessToken: null, isRestoring: false });
});

describe('удаление аккаунта', () => {
  it('последствия видны до нажатия, без пароля удалить нельзя', async () => {
    await renderSettings();

    expect(screen.getByText(ru['account.delete.what.results'])).toBeTruthy();

    const dialog = await openDialog();
    const confirm = within(dialog).getByRole('button', { name: ru['account.delete.confirm'] });

    expect(confirm.hasAttribute('disabled')).toBe(true);
  });

  it('неверный пароль — ошибка у поля, аккаунт на месте', async () => {
    answer = { status: 403, body: { error: { code: 'WRONG_PASSWORD', message: 'x' } } };
    await renderSettings();
    const dialog = await openDialog();

    fireEvent.change(within(dialog).getByLabelText(ru['account.delete.password']), {
      target: { value: 'chuzhoi1' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: ru['account.delete.confirm'] }));

    expect(await within(dialog).findByText(ru['error.api.WRONG_PASSWORD'])).toBeTruthy();
    expect(useSessionStore.getState().user).not.toBeNull();
  });

  it('единственный владелец клуба — объяснение, что сделать сначала', async () => {
    answer = {
      status: 409,
      body: {
        error: {
          code: 'ACCOUNT_DELETE_BLOCKED',
          message: 'x',
          details: { reason: 'LAST_CLUB_OWNER', clubIds: ['c1'] },
        },
      },
    };
    await renderSettings();
    const dialog = await openDialog();

    fireEvent.change(within(dialog).getByLabelText(ru['account.delete.password']), {
      target: { value: 'parol123' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: ru['account.delete.confirm'] }));

    expect(
      await within(dialog).findByText(ru['account.delete.blocked.LAST_CLUB_OWNER']),
    ).toBeTruthy();
  });

  it('после удаления сессии нет, открыта страница итога', async () => {
    const router = await renderSettings();
    const dialog = await openDialog();

    fireEvent.change(within(dialog).getByLabelText(ru['account.delete.password']), {
      target: { value: 'parol123' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: ru['account.delete.confirm'] }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/account-deleted');
    });
    expect(deleteCalls).toEqual([{ password: 'parol123' }]);
    expect(useSessionStore.getState().user).toBeNull();
  });
});
