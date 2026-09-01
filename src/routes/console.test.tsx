import type { AuthUserView } from '@kttf/shared/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { ru } from '@/common/i18n/ru';
import { CONSOLE_STATE, PLAYERS, TOURNAMENT_ID } from '@/test/fixtures';

/**
 * Консоль судьи — ТЗ 6.
 *
 * Главное, что здесь проверяется, — запрет №1 брифа: ввод счёта не ждёт
 * ответа сети. Ответ сервера в тесте не приходит вовсе, и счёт обязан
 * оказаться на экране всё равно.
 */

const SIGNED_IN: AuthUserView = {
  id: '00000000-0000-4000-8000-000000000001',
  phone: '+77011234567',
  email: null,
  locale: 'ru',
  createdAt: '2026-08-30T00:00:00.000Z',
  playerId: null,
  clubRoles: [],
};

/** Запросы, ушедшие на сервер: по ним видно, что действие правда отправлено. */
let sent: string[] = [];

function reply(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function answer(url: string): Promise<Response> {
  if (url.endsWith('/results')) {
    return Promise.resolve(reply(CONSOLE_STATE));
  }

  // Сервер молчит. Для консоли это обычное состояние зала, а не сбой:
  // именно поэтому ввод счёта не имеет права его дожидаться.
  return new Promise<Response>(() => undefined);
}

function renderConsole(): void {
  window.history.pushState({}, '', `/console/${TOURNAMENT_ID}`);

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter({ queryClient, session: SIGNED_IN });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  sent = [];
  vi.stubGlobal('fetch', (input: unknown) => {
    const url = String(input);

    sent.push(url);

    return answer(url);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('экран проведения', () => {
  it('показывает идущую встречу и очередь', async () => {
    renderConsole();

    expect(await screen.findByText(ru['console.playing.title'])).toBeDefined();
    // Первый в очереди отмечен как ждущий дольше всех — ТЗ 6.1.
    expect(await screen.findByText(ru['console.hint.waiting'])).toBeDefined();
  });

  it('предлагает свободный стол, а не занятый', async () => {
    renderConsole();

    // Стол 1 занят идущей встречей, значит предлагается второй.
    expect(
      await screen.findByRole('button', { name: `${ru['console.queue.assign']} 2` }),
    ).toBeDefined();
  });

  it('закрывает встречу двумя действиями и не ждёт сервера', async () => {
    renderConsole();

    // Действие первое: раскрыть карточку идущей встречи.
    const card = await screen.findByRole('button', {
      name: new RegExp(PLAYERS.first.lastName),
    });

    fireEvent.click(card);

    // Действие второе: нажать счёт. Больше между ними ничего нет — ТЗ 6.3.
    fireEvent.click(await screen.findByRole('button', { name: '3:1' }));

    // Ответ сервера не придёт никогда, а счёт обязан быть на экране.
    expect(await screen.findByText('3:1')).toBeDefined();
    expect(sent.some((url) => url.includes('/result'))).toBe(true);
  });
});
