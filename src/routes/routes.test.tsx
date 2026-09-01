import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { AuthUserView } from '@kttf/shared/types';

import { createAppRouter } from '@/app/router';
import { ru } from '@/common/i18n/ru';

/** Вошедший пользователь без ролей и без профиля игрока — минимум для охраны. */
const SIGNED_IN: AuthUserView = {
  id: '00000000-0000-4000-8000-000000000001',
  phone: '+77011234567',
  email: null,
  locale: 'ru',
  createdAt: '2026-08-30T00:00:00.000Z',
  playerId: null,
  clubRoles: [],
};

/**
 * Тексты берутся из словаря, а не переписываются строками: иначе тест
 * начинает проверять сам себя и переживает переименование ключа.
 */
async function renderAt(
  path: string,
  session: AuthUserView | null = null,
): Promise<ReturnType<typeof createAppRouter>> {
  window.history.pushState({}, '', path);

  const queryClient = new QueryClient();
  const router = createAppRouter({ queryClient, session });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  await screen.findByRole('heading');

  return router;
}

describe('маршрутизация', () => {
  it('корень публичной части открывается', async () => {
    await renderAt('/');

    expect(screen.getByRole('heading', { name: ru['page.home.title'] })).toBeDefined();
  });

  it('неизвестный адрес отдаёт страницу «не найдено»', async () => {
    await renderAt('/no-such-page');

    expect(screen.getByRole('heading', { name: ru['error.notFound.title'] })).toBeDefined();
  });

  it('консоль лежит вне публичной оболочки и открывается своим маршрутом', async () => {
    await renderAt('/console', SIGNED_IN);

    expect(screen.getByRole('heading', { name: ru['page.console.title'] })).toBeDefined();
    // Шапки публичной части здесь быть не должно: всё, что в неё входит,
    // уезжает в чанки консоли и считается против бюджета 400 КБ (ТС 8.1).
    expect(screen.queryByRole('link', { name: ru['nav.ratings'] })).toBeNull();
  });

  it('экран зала открывается по публичному токену без входа', async () => {
    await renderAt('/screen/abc123');

    expect(screen.getByRole('heading', { name: ru['page.screen.title'] })).toBeDefined();
  });
});

describe('охрана консоли', () => {
  it('без сессии уводит на вход', async () => {
    // Каждое действие консоли уходит с токеном. Рабочий экран, который
    // откажет на первом же касании, хуже просьбы войти.
    const router = await renderAt('/console');

    expect(router.state.location.pathname).toBe('/login');
  });
});

describe('охрана кабинета', () => {
  it('без сессии уводит на вход и запоминает, куда человек шёл', async () => {
    const router = await renderAt('/cabinet');

    expect(screen.getByRole('heading', { name: ru['page.login.title'] })).toBeDefined();
    expect(router.state.location.pathname).toBe('/login');
    // Иначе человек, открывший ссылку на кабинет, после входа попадёт
    // на главную и будет искать дорогу обратно.
    expect(router.state.location.search).toEqual({ redirect: '/cabinet' });
  });

  it('с сессией пускает', async () => {
    await renderAt('/cabinet', SIGNED_IN);

    expect(screen.getByRole('heading', { name: ru['page.cabinet.title'] })).toBeDefined();
  });
});
