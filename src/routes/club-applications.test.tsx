import type { AuthUserView, ClubApplicationView } from '@kttf/shared/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { ru } from '@/common/i18n/ru';
import { useSessionStore } from '@/features/auth/session-store';
import { ADMIN_USER, placesReply, USER_WITH_PROFILE } from '@/test/fixtures';

/**
 * Заявка клуба — ADR-047.
 *
 * Стережётся контракт: форма уходит на сервер одним запросом в форме схемы,
 * без входа и с пустой ловушкой для ботов; отказ по лимиту показывается
 * словами; администратор видит заявки и отмечает их, остальным раздел
 * закрыт.
 */

interface Sent {
  readonly url: string;
  readonly method: string;
  readonly body: unknown;
}

let sent: Sent[] = [];
/** Отказ на отправку: `null` — принято. */
let refusal: { readonly code: string; readonly status: number } | null = null;

const APPLICATION: ClubApplicationView = {
  id: '00000000-0000-4000-8000-0000000000a1',
  name: 'Арман',
  contact: '+7 701 123 45 67',
  clubName: 'Спин',
  city: 'Караганда',
  address: null,
  tableCount: 6,
  tournaments: 'Раз в месяц, человек 20',
  message: null,
  status: 'NEW',
  userId: null,
  createdAt: '2026-10-18T10:00:00.000Z',
  handledAt: null,
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
  const body: unknown = typeof raw === 'string' ? JSON.parse(raw) : undefined;

  sent.push({ url, method, body });

  if (url.endsWith('/club-applications') && method === 'POST') {
    return refusal === null
      ? reply(undefined, 204)
      : reply({ error: { code: refusal.code, message: 'refused' } }, refusal.status);
  }

  if (url.includes('/admin/club-applications')) {
    if (method === 'PATCH') {
      return reply({ ...APPLICATION, ...(body as object), handledAt: '2026-10-18T11:00:00.000Z' });
    }
    return reply({ items: [APPLICATION], total: 1, page: 1, limit: 20 });
  }

  const places = placesReply(url);
  if (places !== undefined) return reply(places);

  throw new Error(`Неожидаемый запрос: ${url}`);
}

function renderAt(path: string, user: AuthUserView | null): void {
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

function posts(): Sent[] {
  return sent.filter((request) => request.method === 'POST');
}

async function fillRequired(): Promise<void> {
  fireEvent.change(await screen.findByLabelText(new RegExp(ru['apply.field.name'])), {
    target: { value: 'Арман' },
  });
  fireEvent.change(screen.getByLabelText(new RegExp(ru['apply.field.contact'])), {
    target: { value: '+7 701 123 45 67' },
  });
  fireEvent.change(screen.getByLabelText(new RegExp(ru['apply.field.clubName'])), {
    target: { value: 'Спин' },
  });
  fireEvent.change(screen.getByLabelText(new RegExp(`^${ru['apply.field.city']}`)), {
    target: { value: 'Караганда' },
  });
}

beforeEach(() => {
  sent = [];
  refusal = null;
  vi.stubGlobal('fetch', (input: unknown, init: RequestInit | undefined) =>
    Promise.resolve(answer(String(input), init)),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  useSessionStore.setState({ user: null, accessToken: null, isRestoring: false });
});

describe('форма «Напишите нам»', () => {
  it('открывается без входа и уходит одной заявкой в форме схемы', async () => {
    renderAt('/feedback', null);

    await fillRequired();
    fireEvent.change(screen.getByLabelText(ru['apply.field.tableCount']), {
      target: { value: '6' },
    });
    fireEvent.click(screen.getByRole('button', { name: ru['apply.submit'] }));

    expect(await screen.findByText(ru['apply.sent.title'])).toBeDefined();
    expect(posts()).toHaveLength(1);
    expect(posts()[0]?.body).toEqual({
      name: 'Арман',
      contact: '+7 701 123 45 67',
      clubName: 'Спин',
      city: 'Караганда',
      tableCount: 6,
    });
  });

  it('без обязательных полей ничего не отправляет', async () => {
    renderAt('/feedback', null);

    fireEvent.click(await screen.findByRole('button', { name: ru['apply.submit'] }));

    expect(await screen.findAllByText(ru['error.form.name'])).not.toHaveLength(0);
    expect(posts()).toHaveLength(0);
  });

  it('лимит заявок — словами, а не кодом', async () => {
    refusal = { code: 'RATE_LIMITED', status: 429 };
    renderAt('/feedback', null);

    await fillRequired();
    fireEvent.click(screen.getByRole('button', { name: ru['apply.submit'] }));

    expect(await screen.findByText(ru['error.api.RATE_LIMITED'])).toBeDefined();
    expect(screen.queryByText(ru['apply.sent.title'])).toBeNull();
  });
});

describe('заявки у администратора', () => {
  it('не администратору раздел закрыт и ничего не запрашивает', async () => {
    renderAt('/cabinet/applications', USER_WITH_PROFILE);

    expect(await screen.findByText(ru['applications.forbidden.title'])).toBeDefined();
    expect(sent.some((request) => request.url.includes('/admin/'))).toBe(false);
  });

  it('новые заявки видны, «Обработано» уходит правкой статуса', async () => {
    renderAt('/cabinet/applications', ADMIN_USER);

    expect(await screen.findByText(`${APPLICATION.clubName} · ${APPLICATION.city}`)).toBeDefined();
    expect(sent.some((request) => request.url.includes('status=NEW'))).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: ru['applications.markDone'] }));

    await waitFor(() => {
      expect(sent.find((request) => request.method === 'PATCH')).toMatchObject({
        url: expect.stringContaining(`/admin/club-applications/${APPLICATION.id}`) as string,
        body: { status: 'DONE' },
      });
    });
  });
});
