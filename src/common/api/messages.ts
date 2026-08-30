import { isAppError, type ErrorCode } from '@kttf/shared/errors';

import type { MessageKey } from '@/common/i18n';

import { isNetworkError } from './network-error';

/**
 * Локализованный текст для каждого кода ошибки.
 *
 * Сервер отдаёт код (ТС 7.8), клиент подбирает текст: `message` в ответе
 * диагностический и пользователю не показывается — бриф 3.4. Тип `Record`
 * обязывает перечислить все коды, поэтому новый код в общем коде ломает
 * сборку здесь, а не выходит наружу английской строкой.
 */
export const ERROR_MESSAGE_KEYS: Readonly<Record<ErrorCode, MessageKey>> = {
  VALIDATION_FAILED: 'error.api.VALIDATION_FAILED',
  NOT_FOUND: 'error.api.NOT_FOUND',
  UNAUTHORIZED: 'error.api.UNAUTHORIZED',
  FORBIDDEN: 'error.api.FORBIDDEN',
  RATE_LIMITED: 'error.api.RATE_LIMITED',
  INTERNAL_ERROR: 'error.api.INTERNAL_ERROR',

  // Встречи — ТС 7.6.
  TOURNAMENT_NOT_RUNNING: 'error.api.TOURNAMENT_NOT_RUNNING',
  MATCH_NOT_READY: 'error.api.MATCH_NOT_READY',
  MATCH_ALREADY_FINISHED: 'error.api.MATCH_ALREADY_FINISHED',
  MATCH_HAS_NO_RESULT: 'error.api.MATCH_HAS_NO_RESULT',
  INVALID_SCORE: 'error.api.INVALID_SCORE',
  DOWNSTREAM_MATCH_PLAYED: 'error.api.DOWNSTREAM_MATCH_PLAYED',
  TIE_DECISION_INVALID: 'error.api.TIE_DECISION_INVALID',
};

/**
 * Ключ текста для любого отказа.
 *
 * Пользователю никогда не показывается `message` из ответа сервера: он
 * диагностический и английский — бриф 3.4. Показывается то, что подобрано
 * по коду. Отсутствие сети — отдельный случай, для консоли в зале он
 * означает не ошибку, а обычное состояние.
 */
export function errorMessageKey(error: unknown): MessageKey {
  if (isNetworkError(error)) {
    return 'error.network';
  }

  if (isAppError(error)) {
    return ERROR_MESSAGE_KEYS[error.code];
  }

  return 'error.unexpected.title';
}
