import type { PlayerListItemView } from '@kttf/shared/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { fill } from '@/common/i18n';
import { ru } from '@/common/i18n/ru';
import { pageOf, placesReply, PLAYERS } from '@/test/fixtures';

/**
 * «Инвентарь игроков» и «Кто играет» в списке игроков — ADR-054, ADR-058.
 */

const BLADE_ID = '00000000-0000-4000-8000-0000000000e1';

const ROWS: PlayerListItemView[] = [
  {
    ...PLAYERS.first,
    ratingUpdatedAt: null,
    blade: { label: 'Butterfly Viscaria', slug: 'butterfly-viscaria' },
    rubberForehand: { label: 'Butterfly Tenergy 05', slug: 'butterfly-tenergy-05' },
    rubberBackhand: { label: 'Тенерджи 64 старая', slug: null },
  },
  {
    ...PLAYERS.second,
    ratingUpdatedAt: null,
    blade: { label: 'Butterfly Viscaria', slug: 'butterfly-viscaria' },
    rubberForehand: null,
    rubberBackhand: null,
  },
];

function reply(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

let requests: string[] = [];

beforeEach(() => {
  requests = [];
  vi.stubGlobal('fetch', (input: unknown) => {
    const url = decodeURIComponent(String(input));
    requests.push(url);
    const places = placesReply(url);
    if (places !== undefined) return Promise.resolve(reply(places));
    if (url.includes('/clubs')) return Promise.resolve(reply(pageOf([])));
    if (url.includes('/players')) return Promise.resolve(reply(pageOf(ROWS)));

    return Promise.reject(new Error(`Неожидаемый запрос: ${url}`));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderAt(path: string): void {
  window.history.pushState({}, '', path);

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter({ queryClient, session: null });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('инвентарь игроков', () => {
  it('фильтр по основанию из ссылки доходит до сервера, чип подписан товаром', async () => {
    renderAt(`/players?bladeId=${BLADE_ID}&view=equipment`);

    await waitFor(() => {
      expect(
        requests.some((url) => url.includes(`/players?`) && url.includes(`bladeId=${BLADE_ID}`)),
      ).toBe(true);
    });
    // Подпись чипа — из строк ответа: у всех найденных основание одно.
    expect(
      await screen.findByText(
        fill(ru['filter.chip'], { label: ru['players.filter.blade'], value: 'Butterfly Viscaria' }),
      ),
    ).toBeDefined();
  });

  it('колонки «основание / справа / слева»: товар — ссылкой, строка анкеты — текстом', async () => {
    renderAt('/players?view=equipment');

    const table = await screen.findByRole('table');
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent);

    expect(headers).toContain(ru['player.form.blade']);
    expect(headers).toContain(ru['players.column.forehand']);
    expect(headers).toContain(ru['players.column.backhand']);
    expect(headers).not.toContain(ru['ratings.column.city']);

    const links = within(table).getAllByRole('link', { name: 'Butterfly Tenergy 05' });
    expect(links[0]?.getAttribute('href')).toBe('/market/items/butterfly-tenergy-05');
    // Строка анкеты без товара — текст, не ссылка.
    expect(within(table).getAllByText('Тенерджи 64 старая').length).toBeGreaterThan(0);
    expect(within(table).queryByRole('link', { name: 'Тенерджи 64 старая' })).toBeNull();
  });
});
