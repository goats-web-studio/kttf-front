import { AppError, ERROR_CODES, type ErrorCode, isErrorCode } from '@kttf/shared/errors';

import { NetworkError } from './network-error';

/**
 * Базовый адрес API вместе с префиксом версии (ТС 7).
 *
 * Пусто в окружении — значит тот же origin: в деве это прокси Vite, в проде —
 * общий домен на Caddy. CORS не нужен ни там, ни там.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

export interface RequestOptions {
  readonly method?: string;
  readonly body?: unknown;
  readonly signal?: AbortSignal;
  readonly headers?: Readonly<Record<string, string>>;
}

/** Код на случай, когда тело ответа не разобрать: смотрим на статус. */
const CODE_BY_STATUS: Readonly<Record<number, ErrorCode>> = {
  400: ERROR_CODES.VALIDATION_FAILED,
  401: ERROR_CODES.UNAUTHORIZED,
  403: ERROR_CODES.FORBIDDEN,
  404: ERROR_CODES.NOT_FOUND,
  429: ERROR_CODES.RATE_LIMITED,
};

function asRecord(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Readonly<Record<string, unknown>>)
    : undefined;
}

/** Разбор тела отказа по ТС 7.8. Чужой JSON — сужение, а не приведение типа. */
function readError(body: unknown, status: number): AppError {
  const error = asRecord(asRecord(body)?.error);
  const code = error?.code;
  const message = error?.message;
  const details = asRecord(error?.details);

  return new AppError(
    isErrorCode(code) ? code : (CODE_BY_STATUS[status] ?? ERROR_CODES.INTERNAL_ERROR),
    typeof message === 'string' ? message : `HTTP ${String(status)}`,
    details,
  );
}

/**
 * Запрос к API.
 *
 * Наружу отдаёт два вида отказов и только их: `AppError` с кодом из общего
 * кода — когда ответил сервер, `NetworkError` — когда не ответил никто.
 * Вызывающий обязан различать оба, третьего не появится.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, headers } = options;

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      ...(signal === undefined ? {} : { signal }),
    });
  } catch (cause) {
    throw new NetworkError(cause);
  }

  const text = await response.text();
  let payload: unknown;

  try {
    payload = text === '' ? undefined : JSON.parse(text);
  } catch (cause) {
    // Ответ не является JSON. Для успешного статуса это поломка контракта,
    // для отказа — обычная страница прокси. Оба случая разбираются ниже.
    payload = undefined;
    if (response.ok) {
      throw new AppError(ERROR_CODES.INTERNAL_ERROR, 'Ответ API не является JSON', {
        cause: String(cause),
      });
    }
  }

  if (!response.ok) {
    throw readError(payload, response.status);
  }

  return payload as T;
}
