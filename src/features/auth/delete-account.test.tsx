import type { AccountRequestView, AccountStatusView, AuthUserView } from '@kttf/shared/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { ru } from '@/common/i18n/ru';

import { useSessionStore } from './session-store';

/** Удаление аккаунта заявкой в настройках — ADR-095. */

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
  privacyConsentAt: '2026-11-18T00:00:00.000Z',
  privacyConsentVersion: '2026-11-18',
};

const PENDING: AccountRequestView = {
  id: '00000000-0000-4000-8000-0000000000d1',
  kind: 'DELETE',
  status: 'PENDING',
  createdAt: '2026-11-18T09:00:00.000Z',
  decidedAt: null,
  answer: null,
};

const EMPTY: AccountStatusView = {
  deletion: null,
  restore: null,
  restorable: false,
  restorableWithData: false,
};

let status: AccountStatusView = EMPTY;
let answer: { status: number; body: unknown } = { status: 201, body: PENDING };
let requestCalls: unknown[] = [];
let withdrawCalls = 0;

function reply(code: number, body: unknown): Response {
  return {
    ok: code >= 200 && code < 300,
    status: code,
    text: () => Promise.resolve(code === 204 ? '' : JSON.stringify(body)),
  } as unknown as Response;
}

async function renderSettings(): Promise<void> {
  window.history.pushState({}, '', '/settings/account');

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter({ queryClient, session: USER });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  await screen.findByRole('heading', { name: ru['account.delete.title'] });
}

async function openDialog(): Promise<HTMLElement> {
  fireEvent.click(await screen.findByRole('button', { name: ru['account.delete.open'] }));

  return screen.findByRole('dialog');
}

function send(dialog: HTMLElement, password: string): void {
  fireEvent.change(within(dialog).getByLabelText(ru['account.delete.password']), {
    target: { value: password },
  });
  fireEvent.click(within(dialog).getByRole('button', { name: ru['account.delete.confirm'] }));
}

beforeEach(() => {
  status = EMPTY;
  answer = { status: 201, body: PENDING };
  requestCalls = [];
  withdrawCalls = 0;
  useSessionStore.setState({ user: USER, accessToken: 'access-1', isRestoring: false });

  vi.stubGlobal('fetch', (input: unknown, init: RequestInit | undefined) => {
    const url = String(input);

    if (url.includes('/account/deletion-request')) {
      if (init?.method === 'DELETE') {
        withdrawCalls += 1;
        status = EMPTY;
        return Promise.resolve(reply(204, null));
      }
      requestCalls.push(typeof init?.body === 'string' ? JSON.parse(init.body) : undefined);
      if (answer.status === 201) status = { ...EMPTY, deletion: PENDING };
      return Promise.resolve(reply(answer.status, answer.body));
    }
    if (url.includes('/account/requests')) return Promise.resolve(reply(200, status));
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

describe('удаление аккаунта заявкой', () => {
  it('последствия и возможность вернуть историю видны до нажатия, без пароля не отправить', async () => {
    await renderSettings();

    expect(screen.getByText(ru['account.delete.what.results'])).toBeTruthy();
    expect(screen.getByText(ru['account.delete.what.restore'])).toBeTruthy();
    expect(
      screen.getByText(ru['account.delete.what.archive'].replace('{days}', '30')),
    ).toBeTruthy();

    const dialog = await openDialog();
    const confirm = within(dialog).getByRole('button', { name: ru['account.delete.confirm'] });

    expect(confirm.hasAttribute('disabled')).toBe(true);
  });

  it('неверный пароль — ошибка у поля, заявки нет', async () => {
    answer = { status: 403, body: { error: { code: 'WRONG_PASSWORD', message: 'x' } } };
    await renderSettings();
    const dialog = await openDialog();

    send(dialog, 'chuzhoi1');

    expect(await within(dialog).findByText(ru['error.api.WRONG_PASSWORD'])).toBeTruthy();
    expect(screen.queryByText(ru['account.delete.pending.title'])).toBeNull();
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

    send(dialog, 'parol123');

    expect(
      await within(dialog).findByText(ru['account.delete.blocked.LAST_CLUB_OWNER']),
    ).toBeTruthy();
  });

  it('заявка уходит с паролем и причиной, сессия остаётся, видно ожидание', async () => {
    await renderSettings();
    const dialog = await openDialog();

    fireEvent.change(within(dialog).getByLabelText(ru['account.delete.reason']), {
      target: { value: '  ухожу из спорта ' },
    });
    send(dialog, 'parol123');

    expect(await screen.findByText(ru['account.delete.pending.title'])).toBeTruthy();
    expect(requestCalls).toEqual([{ password: 'parol123', reason: 'ухожу из спорта' }]);
    expect(useSessionStore.getState().user).not.toBeNull();
    expect(screen.queryByRole('button', { name: ru['account.delete.open'] })).toBeNull();
  });

  it('ожидающую заявку можно отозвать', async () => {
    status = { ...EMPTY, deletion: PENDING };
    await renderSettings();

    fireEvent.click(await screen.findByRole('button', { name: ru['account.delete.withdraw'] }));

    expect(await screen.findByRole('button', { name: ru['account.delete.open'] })).toBeTruthy();
    expect(withdrawCalls).toBe(1);
  });

  it('отказ — с ответом администратора, заявку можно подать снова', async () => {
    status = {
      ...EMPTY,
      deletion: {
        ...PENDING,
        status: 'REJECTED',
        decidedAt: '2026-11-18T12:00:00.000Z',
        answer: 'Сначала передайте клуб',
      },
    };
    await renderSettings();

    await waitFor(() => {
      expect(screen.getByText(/Сначала передайте клуб/)).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: ru['account.delete.open'] })).toBeTruthy();
  });
});
