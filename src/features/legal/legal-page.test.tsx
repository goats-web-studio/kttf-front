import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createAppRouter } from '@/app/router';
import { ru } from '@/common/i18n/ru';

/**
 * Страницы документов — ADR-091. Открыты без входа: их читают до
 * регистрации и проверяют ревьюеры сторов приложений.
 */
function renderAt(path: string): void {
  window.history.pushState({}, '', path);

  const queryClient = new QueryClient();
  const router = createAppRouter({ queryClient, session: null });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('документы', () => {
  it('политика открывается без входа, с разделом об удалении аккаунта', async () => {
    renderAt('/privacy');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Политика конфиденциальности' }),
    ).toBeDefined();
    // Заголовок страницы виден и до загрузки текста — ждём сам раздел.
    const section = await screen.findByRole('heading', {
      level: 2,
      name: '9. Как удалить аккаунт',
    });
    expect(section.id).toBe('account-deletion');
    expect(screen.getAllByRole('link', { name: 'aa.amanbayew@gmail.com' }).length).toBeGreaterThan(
      0,
    );
  });

  it('соглашение открывается без входа', async () => {
    renderAt('/terms');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Пользовательское соглашение' }),
    ).toBeDefined();
  });

  it('перевод по адресу — с пометкой, что подлинник русский', async () => {
    renderAt('/privacy?lang=en');

    expect(await screen.findByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeDefined();
    expect(screen.getByText(ru['legal.note.translation'])).toBeDefined();
  });

  it('в подвале — ссылки на оба документа', async () => {
    renderAt('/terms');
    await screen.findByRole('heading', { level: 1, name: 'Пользовательское соглашение' });

    const footer = screen.getByRole('contentinfo');
    expect(
      within(footer).getByRole('link', { name: ru['footer.privacy'] }).getAttribute('href'),
    ).toBe('/privacy');
    expect(
      within(footer).getByRole('link', { name: ru['footer.terms'] }).getAttribute('href'),
    ).toBe('/terms');
  });
});
