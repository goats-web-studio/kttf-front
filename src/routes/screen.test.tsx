import { SCREEN_EVENTS } from '@kttf/shared/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { ru } from '@/common/i18n/ru';
import { installFakeEventSource, openStreams } from '@/test/event-source';
import { PLAYERS, SCREEN_STATE, SCREEN_TOKEN } from '@/test/fixtures';

/**
 * Второй экран зала — ТЗ 6.5, ТС 7.7.
 *
 * Проверяется связка целиком: адрес с токеном, запрос, поток, показ.
 * Главное здесь — что состояние обновляется событием из потока, а не опросом,
 * и что обрыв связи не гасит стену: висящий на ней турнир идёт дальше.
 */

function reply(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

let requested: string[] = [];

function renderScreen(): void {
  window.history.pushState({}, '', `/screen/${SCREEN_TOKEN}`);

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter({ queryClient, session: null });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  requested = [];
  installFakeEventSource();
  vi.stubGlobal('fetch', (input: unknown) => {
    requested.push(String(input));

    return Promise.resolve(reply(SCREEN_STATE));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('экран зала', () => {
  it('открывается по токену без входа и показывает столы, очередь и таблицы', async () => {
    renderScreen();

    expect(
      await screen.findByRole('heading', { name: SCREEN_STATE.tournament.name }),
    ).toBeDefined();
    expect(screen.getByText(ru['screen.tables.title'])).toBeDefined();
    // Стол занят идущей встречей, второй свободен — ТЗ 6.1.
    expect(screen.getAllByText(PLAYERS.first.lastName, { exact: false }).length).toBeGreaterThan(0);
    expect(screen.getByText(ru['screen.table.free'])).toBeDefined();
    expect(screen.getByText(ru['screen.queue.title'])).toBeDefined();
    expect(screen.getByText(ru['screen.standings.title'])).toBeDefined();
  });

  it('запрашивает состояние по публичному маршруту', async () => {
    renderScreen();
    await screen.findByRole('heading', { name: SCREEN_STATE.tournament.name });

    expect(requested.some((url) => url.endsWith(`/public/screen/${SCREEN_TOKEN}`))).toBe(true);
    expect(openStreams[0]?.url).toContain(`/public/screen/${SCREEN_TOKEN}/stream`);
  });

  it('событие потока обновляет состояние без нового запроса', async () => {
    renderScreen();
    await screen.findByRole('heading', { name: SCREEN_STATE.tournament.name });

    const before = requested.length;

    act(() => {
      openStreams[0]?.emit(SCREEN_EVENTS.state, {
        ...SCREEN_STATE,
        tournament: { ...SCREEN_STATE.tournament, name: 'Кубок области' },
      });
    });

    expect(await screen.findByRole('heading', { name: 'Кубок области' })).toBeDefined();
    // Ради этого сервер и шлёт состояние целиком: перезапрашивать нечего.
    expect(requested).toHaveLength(before);
  });

  it('обрыв связи не гасит стену, а помечает состояние', async () => {
    renderScreen();
    await screen.findByRole('heading', { name: SCREEN_STATE.tournament.name });

    act(() => {
      openStreams[0]?.emit(SCREEN_EVENTS.ping, { at: SCREEN_STATE.updatedAt });
    });

    expect(screen.queryByText(ru['screen.offline'], { exact: false })).toBeNull();

    act(() => {
      openStreams[0]?.fail();
    });

    // Турнир в зале идёт дальше, и последнее известное состояние полезнее
    // пустого экрана. Но зритель обязан знать, что оно перестало обновляться.
    expect(screen.getByText(ru['screen.offline'], { exact: false })).toBeDefined();
    expect(screen.getByRole('heading', { name: SCREEN_STATE.tournament.name })).toBeDefined();
  });
});
