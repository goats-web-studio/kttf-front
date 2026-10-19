import { configureAuth, isNetworkError } from '@/common/api';

import { endSession, fetchMe, refreshTokens } from './api';
import { useSessionStore } from './session-store';
import { clearRefreshToken, readRefreshToken, readSavedUser } from './token-storage';

/**
 * Чем кончилось обновление пары: обновилась, сервер отказал, сервер не
 * ответил. Последние два — разные вещи: отказ значит «не вошёл», молчание
 * значит «в зале нет сети», и выкидывать судью из сессии за это нельзя.
 */
type RefreshOutcome = 'ok' | 'rejected' | 'offline';

/**
 * Обновление пары токенов.
 *
 * Единственная попытка на всех: параллельные запросы, получившие 401
 * одновременно, обязаны дождаться одного обновления, а не запустить пять.
 * Второе и последующие обновления одним и тем же refresh-токеном обречены —
 * сервер заменяет его при каждом обновлении (ADR-013).
 */
let inFlight: Promise<RefreshOutcome> | null = null;

async function performRefresh(): Promise<RefreshOutcome> {
  const refreshToken = readRefreshToken();

  if (refreshToken === null) {
    return 'rejected';
  }

  try {
    const pair = await refreshTokens(refreshToken);
    useSessionStore.getState().tokensRefreshed(pair.accessToken, pair.refreshToken);
    return 'ok';
  } catch (error) {
    // Сервер не ответил — токен цел, сессия тоже. Стереть его сейчас значило
    // бы потребовать пароль у судьи в зале, где сети нет (ТЗ 6.4).
    if (isNetworkError(error)) return 'offline';

    // Токен отозван, истёк или не существует: человек снова не вошёл.
    useSessionStore.getState().signedOut();
    return 'rejected';
  }
}

function attemptRefresh(): Promise<RefreshOutcome> {
  inFlight ??= performRefresh().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

/** Для клиента API: `true` — запрос можно повторить. */
export async function refreshSession(): Promise<boolean> {
  return (await attemptRefresh()) === 'ok';
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

  const outcome = await attemptRefresh();

  if (outcome === 'offline') {
    restoreOffline();
    return;
  }

  if (outcome === 'rejected') {
    return;
  }

  try {
    const user = await fetchMe();
    // Токен — после запроса: `fetchMe` мог по дороге обновить пару.
    const accessToken = useSessionStore.getState().accessToken;

    if (accessToken === null) {
      throw new Error('Токен пропал между обновлением и запросом пользователя');
    }

    useSessionStore.getState().userLoaded(user, accessToken);
  } catch (error) {
    if (isNetworkError(error)) {
      // Сеть пропала между обновлением и запросом пользователя.
      restoreOffline();
      return;
    }

    // Пара обновилась, а пользователь не пришёл: аккаунт удалён. Считаем,
    // что не вошли, — иначе интерфейс покажет кабинет без данных.
    useSessionStore.getState().signedOut();
  }
}

/**
 * Перезагрузка без сети — ТЗ 6.4, консоль в зале с выключенным Wi-Fi.
 *
 * Вошедший берётся последний известный с диска, токена нет: консоль
 * откроется из своего снимка турнира, действия лягут в очередь. Сеть
 * вернётся — сессия восстановится по-настоящему и пользователь перечитается.
 * Записи на диске нет (вход был до этой версии) — экран входа, как раньше,
 * но refresh-токен не стирается, и с сетью вход восстановится сам.
 */
function restoreOffline(): void {
  const saved = readSavedUser();

  if (saved === null) {
    useSessionStore.getState().restoreFinished();
  } else {
    useSessionStore.getState().restoredOffline(saved);
  }

  globalThis.addEventListener('online', () => void restoreSession(), { once: true });
}

/**
 * Перечитать вошедшего.
 *
 * Нужно там, где состав пользователя меняется от его же действия, а токены —
 * нет: заведённый профиль игрока проставляет `playerId`, и без обновления
 * кабинет предлагал бы завести профиль, который уже есть.
 *
 * Токен берётся **после** запроса, а не до: `fetchMe` мог по дороге обновить
 * пару, и записанный заранее оказался бы прежним, уже недействительным.
 */
export async function reloadUser(): Promise<void> {
  const user = await fetchMe();
  const accessToken = useSessionStore.getState().accessToken;

  if (accessToken === null) {
    // Человек вышел, пока запрос шёл. Возвращать его в сессию нельзя.
    return;
  }

  useSessionStore.getState().userLoaded(user, accessToken);
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
