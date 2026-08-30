/**
 * Единственное место, где refresh-токен попадает на диск.
 *
 * ТЗ 2.1 требует сессию на 90 дней с продлением при активности — значит
 * что-то обязано пережить закрытие вкладки. Здесь это refresh-токен и только
 * он: access-токен живёт 15 минут и остаётся в памяти.
 *
 * Запрет №10 брифа — про данные турнира: их место в IndexedDB через Dexie,
 * потому что там объёмы и требования к надёжности. К одной строке токена это
 * не относится. См. ADR-017.
 */
const KEY = 'kttf.refresh-token';

export function readRefreshToken(): string | null {
  try {
    return globalThis.localStorage.getItem(KEY);
  } catch {
    // Приватный режим Safari и запрет хранилища в настройках браузера бросают
    // прямо на чтении. Отсутствие токена — это просто «не вошёл».
    return null;
  }
}

export function writeRefreshToken(token: string): void {
  try {
    globalThis.localStorage.setItem(KEY, token);
  } catch {
    // Хранилище недоступно: вход отработает, но не переживёт перезагрузку.
    // Ломать из-за этого сам вход нельзя.
  }
}

export function clearRefreshToken(): void {
  try {
    globalThis.localStorage.removeItem(KEY);
  } catch {
    // Удалять нечего или хранилище недоступно — оба случая безобидны.
  }
}
