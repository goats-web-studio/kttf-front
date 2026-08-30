/**
 * Запрос не дошёл до сервера.
 *
 * Отдельный класс, а не код из `ERROR_CODES`: те описывают отказы, которые
 * сервер сформулировал сам. Здесь ответа нет вообще, и для консоли это
 * штатное состояние — в зале без сети, а не ошибка. Различать их обязательно:
 * от этого зависит, уходит операция в очередь синхронизации или показывается
 * отказом.
 */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super('Запрос не дошёл до сервера', { cause });
    this.name = 'NetworkError';
  }
}

export function isNetworkError(value: unknown): value is NetworkError {
  return value instanceof NetworkError;
}
