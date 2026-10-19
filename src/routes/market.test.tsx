import type { BrandView, ProductListItemView, ProductView } from '@kttf/shared/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { ru } from '@/common/i18n/ru';
import { pageOf } from '@/test/fixtures';

/**
 * Маркет от адреса до запроса — `docs/10` 5.1–5.4.
 *
 * Стережётся связка: категория из пути, условия из адреса доходят до
 * сервера в его виде, неизвестная категория — «не найдено», страница товара
 * без пустых блоков.
 */

const BRAND: BrandView = {
  id: '00000000-0000-4000-8000-0000000000d1',
  name: 'Butterfly',
  slug: 'butterfly',
  country: 'Япония',
  website: null,
  logoUrl: null,
  counts: { BLADE: 2 },
};

const ITEM: ProductListItemView = {
  id: '00000000-0000-4000-8000-0000000000e1',
  slug: 'butterfly-viscaria',
  category: 'BLADE',
  name: 'Viscaria',
  brand: { id: BRAND.id, name: BRAND.name, slug: BRAND.slug },
  image: null,
};

const PRODUCT: ProductView = {
  id: ITEM.id,
  slug: ITEM.slug,
  category: ITEM.category,
  name: ITEM.name,
  brand: ITEM.brand,
  aliases: ['Вискария'],
  description: null,
  attrs: { bladeType: 'OFF', weight: 88 },
  options: { handle: ['FL', 'ST'] },
  images: [],
  status: 'PUBLISHED',
  createdAt: '2026-10-19T00:00:00.000Z',
  updatedAt: '2026-10-19T00:00:00.000Z',
};

function reply(body: unknown, status = 200): Response {
  return {
    ok: status < 400,
    status,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
  } as unknown as Response;
}

function answer(url: string): Response {
  if (url.includes('/catalog/brands')) return reply([BRAND]);
  if (url.includes('/catalog/products/butterfly-viscaria')) return reply(PRODUCT);
  if (url.includes('/catalog/products/')) {
    return reply({ error: { code: 'NOT_FOUND', message: 'nope' } }, 404);
  }
  if (url.includes('/catalog/products')) return reply(pageOf([ITEM]));

  throw new Error(`Неожидаемый запрос: ${url}`);
}

let requests: string[] = [];
const beacons: string[] = [];

beforeEach(() => {
  requests = [];
  beacons.length = 0;
  window.sessionStorage.clear();
  vi.stubGlobal('fetch', (input: unknown) => {
    requests.push(decodeURIComponent(String(input)));
    return Promise.resolve(answer(String(input)));
  });
  Object.defineProperty(navigator, 'sendBeacon', {
    configurable: true,
    value: (url: string) => {
      beacons.push(url);
      return true;
    },
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

describe('список категории', () => {
  it('неизвестная категория — «не найдено» с дорогой в маркет, без запроса товаров', async () => {
    renderAt('/market/no-such-category');

    expect(
      await screen.findByRole('heading', { name: ru['market.categoryNotFound.title'] }),
    ).toBeDefined();
    expect(
      screen.getByRole('link', { name: ru['market.categoryNotFound.action'] }).getAttribute('href'),
    ).toBe('/market');
    expect(requests.some((url) => url.includes('/catalog/products'))).toBe(false);
  });

  it('условия из ссылки доходят до сервера, кривые — нет', async () => {
    renderAt('/market/blades?bladeType=OFF,NOPE&weight=80-90&tensor=1&sort=name');

    expect(await screen.findByRole('heading', { name: ru['market.category.BLADE'] })).toBeDefined();
    await waitFor(() => {
      expect(requests.some((url) => url.includes('/catalog/products?'))).toBe(true);
    });

    const query = requests.find((url) => url.includes('/catalog/products?')) ?? '';
    expect(query).toContain('category=BLADE');
    expect(query).toContain('bladeType=OFF&');
    expect(query).toContain('weight=80-90');
    expect(query).toContain('sort=name');
    // Тензор — у накладок, не у оснований.
    expect(query).not.toContain('tensor');
    expect(await screen.findByRole('link', { name: /Viscaria/ })).toBeDefined();
  });
});

describe('страница товара', () => {
  it('характеристики и варианты есть, пустых блоков нет, просмотр учтён один раз', async () => {
    renderAt('/market/items/butterfly-viscaria');

    expect(await screen.findByRole('heading', { name: 'Viscaria', level: 1 })).toBeDefined();
    expect(screen.getByRole('heading', { name: ru['market.product.attributes'] })).toBeDefined();
    expect(screen.getByText(ru['market.handle.FL'])).toBeDefined();
    // Описания и фото нет — и разделов под них нет (ADR-042).
    expect(screen.queryByRole('heading', { name: ru['market.product.description'] })).toBeNull();
    expect(screen.queryByRole('region', { name: ru['market.gallery.title'] })).toBeNull();
    expect(beacons).toEqual([`/api/v1/catalog/products/${PRODUCT.id}/view`]);
  });

  it('неизвестный товар — «не найдено»', async () => {
    renderAt('/market/items/nothing-here');

    expect(
      await screen.findByRole('heading', { name: ru['market.product.notFound'] }),
    ).toBeDefined();
  });
});
