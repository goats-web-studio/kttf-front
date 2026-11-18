import type { AccountStatusView, AdminAccountRequestView, AuthUserView } from '@kttf/shared/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { ru } from '@/common/i18n/ru';
import { useSessionStore } from '@/features/auth/session-store';

/** Восстановление архивного профиля и решения администратора — ADR-095. */

const USER: AuthUserView = {
  id: '00000000-0000-4000-8000-000000000001',
  phone: '+77011234567',
  login: 'aslan',
  email: null,
  locale: 'ru',
  telegramId: null,
  createdAt: '2026-11-18T00:00:00.000Z',
  playerId: null,
  clubRoles: [],
  isAdmin: false,
  coach: null,
  privacyConsentAt: '2026-11-18T00:00:00.000Z',
  privacyConsentVersion: '2026-11-18',
  city: null,
};

const ADMIN: AuthUserView = { ...USER, id: '00000000-0000-4000-8000-0000000000aa', isAdmin: true };

const PLAYER = {
  id: '00000000-0000-4000-8000-0000000000e1',
  lastName: 'Сейтов',
  firstName: 'Аслан',
  birthYear: 1994,
  rating: '512.4',
  tournaments: 17,
};

const DELETE_REQUEST: AdminAccountRequestView = {
  id: '00000000-0000-4000-8000-0000000000d1',
  kind: 'DELETE',
  status: 'PENDING',
  createdAt: '2026-11-18T09:00:00.000Z',
  decidedAt: null,
  answer: null,
  reason: 'Ухожу из спорта',
  user: { id: USER.id, login: 'aslan', phone: '+77011234567' },
  player: PLAYER,
  claimedName: null,
};

const RESTORE_REQUEST: AdminAccountRequestView = {
  ...DELETE_REQUEST,
  id: '00000000-0000-4000-8000-0000000000f1',
  kind: 'RESTORE',
  reason: null,
  player: { ...PLAYER, lastName: '', firstName: '' },
  claimedName: 'Сейтов Аслан',
};

let status: AccountStatusView;
let requests: AdminAccountRequestView[];
let calls: { url: string; method: string; body: unknown }[];

function parse(body: unknown): unknown {
  return typeof body === 'string' ? (JSON.parse(body) as unknown) : undefined;
}

function reply(code: number, body: unknown): Response {
  return {
    ok: code >= 200 && code < 300,
    status: code,
    text: () => Promise.resolve(code === 204 ? '' : JSON.stringify(body)),
  } as unknown as Response;
}

function renderAt(path: string, session: AuthUserView): void {
  useSessionStore.setState({ user: session, accessToken: 'access-1', isRestoring: false });
  window.history.pushState({}, '', path);

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter({ queryClient, session });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  status = { deletion: null, restore: null, restorable: true, restorableWithData: true };
  requests = [DELETE_REQUEST, RESTORE_REQUEST];
  calls = [];

  vi.stubGlobal('fetch', (input: unknown, init: RequestInit | undefined) => {
    // Путь без префикса API: сравнивается точно, а не «содержит».
    const url = String(input).replace(/^.*?(\/(?:admin\/)?account)/, '$1');
    const method = init?.method ?? 'GET';
    const body = parse(init?.body);

    if (url.includes('/account/restore-request')) {
      calls.push({ url, method, body });
      const created = {
        id: '00000000-0000-4000-8000-0000000000f2',
        kind: 'RESTORE',
        status: 'PENDING',
        createdAt: '2026-11-18T10:00:00.000Z',
        decidedAt: null,
        answer: null,
      };
      status = { ...status, restore: created as AccountStatusView['restore'] };
      return Promise.resolve(reply(201, created));
    }
    if (url.includes('/account/requests')) return Promise.resolve(reply(200, status));
    if (url.includes('/admin/account-requests')) {
      if (method === 'POST') {
        calls.push({ url, method, body });
        requests = requests.filter((item) => !url.includes(item.id));
        return Promise.resolve(reply(204, null));
      }
      return Promise.resolve(reply(200, requests));
    }
    if (url.includes('/countries') || url.includes('/cities')) {
      return Promise.resolve(reply(200, []));
    }

    return Promise.resolve(reply(200, { items: [], total: 0, page: 1, limit: 20 }));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  useSessionStore.setState({ user: null, accessToken: null, isRestoring: false });
});

describe('восстановление профиля из архива', () => {
  it('кабинет предлагает заявку, имя уходит без пробелов, дальше — ожидание', async () => {
    renderAt('/cabinet', USER);

    expect(await screen.findByText(ru['account.restore.title'])).toBeTruthy();
    expect(screen.getByText(ru['account.restore.withData'])).toBeTruthy();

    const submit = screen.getByRole('button', { name: ru['account.restore.submit'] });
    expect(submit.hasAttribute('disabled')).toBe(true);

    fireEvent.change(screen.getByLabelText(new RegExp(ru['account.restore.lastName'])), {
      target: { value: ' Сейтов ' },
    });
    fireEvent.change(screen.getByLabelText(new RegExp(`^${ru['account.restore.firstName']}`)), {
      target: { value: 'Аслан' },
    });
    fireEvent.click(submit);

    expect(await screen.findByText(/Заявка на восстановление отправлена/)).toBeTruthy();
    expect(calls).toEqual([
      {
        url: '/account/restore-request',
        method: 'POST',
        body: { lastName: 'Сейтов', firstName: 'Аслан' },
      },
    ]);
  });

  it('личные данные архива стёрты — честно: вернётся только история', async () => {
    status = { ...status, restorableWithData: false };
    renderAt('/cabinet', USER);

    expect(await screen.findByText(ru['account.restore.historyOnly'])).toBeTruthy();
  });

  it('архива нет — блока нет', async () => {
    status = { ...status, restorable: false };
    renderAt('/cabinet', USER);

    await screen.findByRole('heading', { level: 1, name: ru['page.cabinet.title'] });
    await waitFor(() => {
      expect(calls).toEqual([]);
    });
    expect(screen.queryByText(ru['account.restore.title'])).toBeNull();
  });
});

describe('заявки по аккаунтам у администратора', () => {
  it('удаление одобряется после предупреждения о закрытии аккаунта', async () => {
    renderAt('/admin/accounts', ADMIN);

    const card = (await screen.findByText('Ухожу из спорта')).closest('li');
    if (card === null) throw new Error('нет карточки');
    // Профиль — так, чтобы его узнать: год рождения, рейтинг, турниры.
    expect(within(card).getByText('1994 г. р. · рейтинг 512.4 · турниров: 17')).toBeTruthy();
    fireEvent.click(within(card).getByRole('button', { name: ru['admin.accounts.approve'] }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(ru['admin.accounts.approve.DELETE.title'])).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: ru['admin.accounts.approve'] }));

    await waitFor(() => {
      expect(calls.map((call) => call.url)).toEqual([
        `/admin/account-requests/${DELETE_REQUEST.id}/approve`,
      ]);
    });
    await waitFor(() => {
      expect(screen.queryByText('Ухожу из спорта')).toBeNull();
    });
  });

  it('отказ — только с ответом человеку', async () => {
    renderAt('/admin/accounts', ADMIN);

    const claimed = await screen.findByText('Сейтов Аслан', { selector: 'dd' });
    const card = claimed.closest('li');
    if (card === null) throw new Error('нет карточки');
    fireEvent.click(within(card).getByRole('button', { name: ru['admin.accounts.reject'] }));

    const dialog = await screen.findByRole('dialog');
    const submit = within(dialog).getByRole('button', { name: ru['admin.accounts.reject'] });
    expect(submit.hasAttribute('disabled')).toBe(true);

    fireEvent.change(
      within(dialog).getByLabelText(new RegExp(ru['admin.accounts.reject.answer'])),
      {
        target: { value: 'Имя не совпадает с профилем' },
      },
    );
    fireEvent.click(submit);

    await waitFor(() => {
      expect(calls).toEqual([
        {
          url: `/admin/account-requests/${RESTORE_REQUEST.id}/reject`,
          method: 'POST',
          body: { answer: 'Имя не совпадает с профилем' },
        },
      ]);
    });
  });
});
