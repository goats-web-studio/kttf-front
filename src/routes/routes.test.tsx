import { QueryClient } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createAppRouter } from '@/app/router';
import { ru } from '@/common/i18n/ru';
import type { Session } from '@/common/session/session';

/**
 * Тексты берутся из словаря, а не переписываются строками: иначе тест
 * начинает проверять сам себя и переживает переименование ключа.
 */
async function renderAt(
  path: string,
  session: Session | null = null,
): Promise<ReturnType<typeof createAppRouter>> {
  window.history.pushState({}, '', path);

  const router = createAppRouter({ queryClient: new QueryClient(), session });

  render(<RouterProvider router={router} />);
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
    await renderAt('/console');

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

describe('охрана кабинета', () => {
  it('без сессии уводит на публичную часть', async () => {
    const router = await renderAt('/cabinet');

    expect(screen.getByRole('heading', { name: ru['page.home.title'] })).toBeDefined();
    expect(router.state.location.pathname).toBe('/');
  });

  it('с сессией пускает', async () => {
    await renderAt('/cabinet', { userId: 'user-1' });

    expect(screen.getByRole('heading', { name: ru['page.cabinet.title'] })).toBeDefined();
  });
});
