import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiRequest, configureAuth } from '@/common/api';

import { connectSessionToApi } from './session';
import { useSessionStore } from './session-store';
import { readRefreshToken, writeRefreshToken } from './token-storage';

/** Минимальный ответ: клиент читает только `ok`, `status` и `text()`. */
function reply(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

const UNAUTHORIZED = reply(401, { error: { code: 'UNAUTHORIZED', message: 'expired' } });

beforeEach(() => {
  globalThis.localStorage.clear();
  useSessionStore.setState({ user: null, accessToken: null, isRestoring: false });
  connectSessionToApi();
});

afterEach(() => {
  vi.unstubAllGlobals();
  configureAuth(null);
});

describe('истёкший access-токен', () => {
  it('обновляется прозрачно, запрос повторяется', async () => {
    // Срок жизни токена 15 минут (ADR-013). Без прозрачного обновления
    // человек входил бы заново каждые четверть часа.
    writeRefreshToken('refresh-1');
    useSessionStore.setState({ accessToken: 'expired' });

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(UNAUTHORIZED)
      .mockResolvedValueOnce(reply(200, { accessToken: 'access-2', refreshToken: 'refresh-2' }))
      .mockResolvedValueOnce(reply(200, { items: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest('/players')).resolves.toEqual({ items: [] });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(useSessionStore.getState().accessToken).toBe('access-2');
    // Сервер заменяет refresh-токен при каждом обновлении — сохраняем новый.
    expect(readRefreshToken()).toBe('refresh-2');
  });

  it('повтор ровно один: второй отказ наружу, а не в цикл', async () => {
    writeRefreshToken('refresh-1');

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(UNAUTHORIZED)
      .mockResolvedValueOnce(reply(200, { accessToken: 'access-2', refreshToken: 'refresh-2' }))
      .mockResolvedValueOnce(UNAUTHORIZED);
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest('/players')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('если обновить не удалось, человек считается вышедшим', async () => {
    writeRefreshToken('refresh-1');
    useSessionStore.setState({ accessToken: 'expired' });

    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValueOnce(UNAUTHORIZED).mockResolvedValueOnce(UNAUTHORIZED),
    );

    await expect(apiRequest('/players')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });

    expect(useSessionStore.getState().accessToken).toBeNull();
    expect(readRefreshToken()).toBeNull();
  });

  it('без refresh-токена обновление не запрашивается вовсе', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(UNAUTHORIZED);
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest('/players')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('несколько одновременных отказов вызывают одно обновление', async () => {
    // Второе обновление тем же токеном обречено: сервер его уже заменил.
    // Без общей попытки параллельные запросы выбрасывали бы человека наружу.
    writeRefreshToken('refresh-1');

    let refreshes = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockImplementation((input) => {
        // Клиент всегда зовёт fetch строкой; других форм здесь не бывает.
        const url = typeof input === 'string' ? input : '';

        if (url.endsWith('/auth/refresh')) {
          refreshes += 1;
          return Promise.resolve(
            reply(200, { accessToken: 'access-2', refreshToken: 'refresh-2' }),
          );
        }

        return Promise.resolve(
          useSessionStore.getState().accessToken === 'access-2'
            ? reply(200, { ok: true })
            : UNAUTHORIZED,
        );
      }),
    );

    await Promise.all([apiRequest('/players'), apiRequest('/clubs'), apiRequest('/ratings')]);

    expect(refreshes).toBe(1);
  });
});
