import { configureAuth } from '@/common/api';

import { endSession, fetchMe, refreshTokens } from './api';
import { useSessionStore } from './session-store';
import { clearRefreshToken, readRefreshToken } from './token-storage';

/**
 * Обновление пары токенов.
 *
 * Единственная попытка на всех: параллельные запросы, получившие 401
 * одновременно, обязаны дождаться одного обновления, а не запустить пять.
 * Второе и последующие обновления одним и тем же refresh-токеном обречены —
 * сервер заменяет его при каждом обновлении (ADR-013).
 */
let inFlight: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  const refreshToken = readRefreshToken();

  if (refreshToken === null) {
    return false;
  }

  try {
    const pair = await refreshTokens(refreshToken);
    useSessionStore.getState().tokensRefreshed(pair.accessToken, pair.refreshToken);
    return true;
  } catch {
    // Токен отозван, истёк или не существует. Разбирать причину незачем:
    // во всех случаях человек снова не вошёл.
    useSessionStore.getState().signedOut();
    return false;
  }
}

export function refreshSession(): Promise<boolean> {
  inFlight ??= performRefresh().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

/** Связывает клиент API с хранилищем сессии. Вызывается один раз при старте. */
export function connectSessionToApi(): void {
  configureAuth({
    accessToken: () => useSessionStore.getState().accessToken,
    refresh: refreshSession,
  });
}

/**
 * Восстановление сессии при запуске.
 *
 * Access-токен в памяти не пережил перезагрузку, refresh-токен пережил.
 * Пара обновляется, затем берётся пользователь: `refresh` по ТС 7.1 отдаёт
 * только токены, состав пользователя приходит отдельным запросом.
 */
let restoring: Promise<void> | null = null;

export function restoreSession(): Promise<void> {
  restoring ??= performRestore().finally(() => {
    restoring = null;
  });

  return restoring;
}

async function performRestore(): Promise<void> {
  const store = useSessionStore.getState();

  if (readRefreshToken() === null) {
    store.restoreFinished();
    return;
  }

  if (!(await refreshSession())) {
    return;
  }

  try {
    const accessToken = useSessionStore.getState().accessToken;
    const user = await fetchMe();

    if (accessToken === null) {
      throw new Error('Токен пропал между обновлением и запросом пользователя');
    }

    useSessionStore.getState().userLoaded(user, accessToken);
  } catch {
    // Пара обновилась, а пользователь не пришёл: аккаунт удалён либо сервер
    // недоступен. Считаем, что не вошли, — иначе интерфейс покажет кабинет
    // без данных.
    useSessionStore.getState().signedOut();
  }
}

/** Выход. Сессия на сервере гасится, но отказ там не мешает выйти локально. */
export async function signOut(): Promise<void> {
  const refreshToken = readRefreshToken();

  clearRefreshToken();
  useSessionStore.getState().signedOut();

  if (refreshToken !== null) {
    try {
      await endSession(refreshToken);
    } catch {
      // Сервер недоступен или токен уже недействителен. Локально человек
      // вышел, а серверная сессия истечёт сама.
    }
  }
}
