import type { AuthUserView } from '@kttf/shared/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { ru } from '@/common/i18n/ru';
import { useSessionStore } from '@/features/auth/session-store';
import { CLUB, pageOf, USER_WITH_PROFILE } from '@/test/fixtures';

/**
 * Управление клубом — состав (ТЗ 1, ADR-043).
 *
 * Стережётся то, на чём владелец спотыкается в жизни: номер, вписанный как
 * привык, обязан найти человека, а отказ — объяснить, что делать дальше,
 * а не «ресурс не найден».
 */

interface Sent {
  readonly url: string;
  readonly method: string;
  readonly body: unknown;
}

let sent: Sent[] = [];
/** Ответ на добавление. `null` — успех. */
let refusal: { readonly status: number; readonly code: string } | null = null;

const OWNER_MEMBER = {
  userId: USER_WITH_PROFILE.id,
  role: 'OWNER',
  playerId: USER_WITH_PROFILE.playerId,
  name: 'Владельцев Олег',
};

function reply(body: unknown, status = 200): Response {
  return {
    ok: status < 400,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function answer(url: string, init: RequestInit | undefined): Response {
  const method = init?.method ?? 'GET';
  const raw = init?.body;

  sent.push({ url, method, body: typeof raw === 'string' ? JSON.parse(raw) : undefined });

  if (/\/clubs\/[^/]+\/members$/.test(url)) {
    if (method === 'GET') return reply([OWNER_MEMBER]);
    if (refusal !== null) {
      return reply({ error: { code: refusal.code, message: 'refused' } }, refusal.status);
    }
    return reply({ userId: 'u-2', role: 'ORGANIZER', playerId: null, name: 'Организаторова Ольга' });
  }
  if (/\/clubs\/[^/?]+$/.test(url)) return reply(CLUB);
  if (url.includes('/clubs')) return reply(pageOf([CLUB]));
  if (url.includes('/tournaments')) return reply(pageOf([]));

  throw new Error(`Неожидаемый запрос: ${url}`);
}

function renderManagement(user: AuthUserView): void {
  useSessionStore.setState({ user, accessToken: 'token', isRestoring: false });
  window.history.pushState({}, '', `/cabinet/club/${CLUB.id}`);

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter({ queryClient, session: user });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

async function addMember(value: string): Promise<void> {
  fireEvent.change(await screen.findByLabelText(ru['club.staff.add.identifier']), {
    target: { value },
  });
  fireEvent.click(screen.getByRole('button', { name: ru['club.staff.add.submit'] }));
}

beforeEach(() => {
  sent = [];
  refusal = null;
  vi.stubGlobal('fetch', (input: unknown, init?: RequestInit) =>
    Promise.resolve(answer(String(input), init)),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  useSessionStore.setState({ user: null, accessToken: null, isRestoring: false });
});

describe('состав клуба в управлении', () => {
  it('номер, вписанный как привыкли, уходит в формате, который ищет сервер', async () => {
    renderManagement(USER_WITH_PROFILE);

    await addMember('8 701 123 45 67');

    await waitFor(() => {
      expect(sent.find((request) => request.method === 'POST')?.body).toEqual({
        identifier: '+77011234567',
        role: 'ORGANIZER',
      });
    });
    expect(await screen.findByText(/Организаторова Ольга/)).toBeDefined();
  });

  it('незнакомый логин объясняется: пусть человек зарегистрируется', async () => {
    refusal = { status: 404, code: 'NOT_FOUND' };
    renderManagement(USER_WITH_PROFILE);

    await addMember('nobody');

    expect(await screen.findByText(ru['club.staff.add.notFound'])).toBeDefined();
  });

  it('организатор состав видит, но не меняет', async () => {
    // Состав ведёт владелец — ТЗ 1. Форма, которую сервер отвергнет, —
    // ложное обещание.
    renderManagement({
      ...USER_WITH_PROFILE,
      clubRoles: [{ clubId: CLUB.id, role: 'ORGANIZER' }],
    });

    expect(await screen.findByText(/Владельцев Олег/)).toBeDefined();
    expect(screen.queryByLabelText(ru['club.staff.add.identifier'])).toBeNull();
    expect(screen.queryByRole('button', { name: ru['club.staff.remove'] })).toBeNull();
  });
});
