import type { ErrorCode } from '@kttf/shared/errors';

import type { MessageKey } from '@/common/i18n';

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
};
