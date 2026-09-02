import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ru } from '@/common/i18n/ru';
import { useSessionStore } from '@/features/auth/session-store';
import { USER_WITH_PROFILE } from '@/test/fixtures';

import App from './app';


/**
 * Охрана маршрутов при **прямом открытии по ссылке**.
 *
 * Остальные тесты собирают роутер сами и передают ему сессию готовой, поэтому
 * этот случай они не покрывали: приложение заводит роутер само, и до правки
 * оно делало это раньше, чем восстанавливалась сессия. Вошедший человек,
 * открывший ссылку на кабинет, попадал на страницу входа — а переходом внутри
 * приложения тот же кабинет открывался.
 */

function reply(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function answer(url: string): Response {
  if (url.includes('/auth/refresh')) {
    return reply({ accessToken: 'access', refreshToken: 'refresh-2' });
  }
  if (url.includes('/auth/me')) return reply(USER_WITH_PROFILE);
  if (url.includes('/players')) return reply({ items: [], total: 0, page: 1, limit: 20 });
  if (url.includes('/clubs')) return reply({ items: [], total: 0, page: 1, limit: 20 });

  return reply({ items: [], total: 0, page: 1, limit: 20 });
}

beforeEach(() => {
  localStorage.setItem('kttf.refresh-token', 'refresh-1');
  useSessionStore.setState({ user: null, accessToken: null, isRestoring: true });
  vi.stubGlobal('fetch', (input: unknown) => Promise.resolve(answer(String(input))));
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  useSessionStore.setState({ user: null, accessToken: null, isRestoring: false });
});

describe('прямая ссылка на защищённую страницу', () => {
  it('вошедшего пускает в кабинет, а не выбрасывает на вход', async () => {
    window.history.pushState({}, '', '/cabinet');

    render(<App />);

    expect(await screen.findByText(ru['page.cabinet.title'])).toBeDefined();
    expect(screen.queryByRole('heading', { name: ru['page.login.title'] })).toBeNull();
  });

  it('вошедшего пускает в создание турнира', async () => {
    window.history.pushState({}, '', '/tournaments/new');

    render(<App />);

    expect(await screen.findByText(ru['page.newTournament.title'])).toBeDefined();
  });

  it('невошедшего по-прежнему отправляет на вход', async () => {
    // Охрана обязана остаться охраной: правка меняла момент, когда сессия
    // попадает в контекст, а не само правило.
    localStorage.clear();
    window.history.pushState({}, '', '/cabinet');

    render(<App />);

    // Именно заголовок: «Вход» есть ещё и ссылкой в шапке.
    expect(await screen.findByRole('heading', { name: ru['page.login.title'] })).toBeDefined();
  });
});
