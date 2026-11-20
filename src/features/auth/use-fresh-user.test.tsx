import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ADMIN_USER, USER_WITH_PROFILE } from '@/test/fixtures';

import { useSessionStore } from './session-store';
import useFreshUser, { FRESH_USER_INTERVAL_MS } from './use-fresh-user';

/**
 * Перечитывание вошедшего при возвращении на вкладку — ADR-100.
 *
 * Стережётся сценарий пилота: владельца добавили в клуб из другого браузера,
 * а его «Мои клубы» оставались пустыми до перезагрузки.
 */

let meCalls = 0;

beforeEach(() => {
  meCalls = 0;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-21T10:00:00.000Z'));
  useSessionStore.setState({ user: USER_WITH_PROFILE, accessToken: 'token', isRestoring: false });
  vi.stubGlobal('fetch', (input: unknown) => {
    if (String(input).includes('/auth/me')) meCalls += 1;

    return Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(ADMIN_USER)),
    } as unknown as Response);
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  useSessionStore.setState({ user: null, accessToken: null, isRestoring: false });
});

describe('useFreshUser', () => {
  it('возвращение на вкладку перечитывает вошедшего — роли приходят без перезагрузки', async () => {
    renderHook(() => {
      useFreshUser();
    });

    vi.setSystemTime(Date.now() + FRESH_USER_INTERVAL_MS + 1);
    globalThis.dispatchEvent(new Event('focus'));

    await vi.waitFor(() => {
      expect(useSessionStore.getState().user?.isAdmin).toBe(true);
    });
    expect(meCalls).toBe(1);
  });

  it('не чаще раза в интервал: частые переключения вкладок не шлют запросы', () => {
    renderHook(() => {
      useFreshUser();
    });

    globalThis.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));

    expect(meCalls).toBe(0);
  });

  it('гостя не перечитывает', () => {
    useSessionStore.setState({ user: null, accessToken: null, isRestoring: false });
    renderHook(() => {
      useFreshUser();
    });

    vi.setSystemTime(Date.now() + FRESH_USER_INTERVAL_MS + 1);
    globalThis.dispatchEvent(new Event('focus'));

    expect(meCalls).toBe(0);
  });
});
