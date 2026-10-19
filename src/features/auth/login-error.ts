import { ERROR_CODES, isAppError } from '@kttf/shared/errors';

import { errorMessageKey } from '@/common/api';
import { fill, type MessageKey } from '@/common/i18n';

/**
 * Текст отказа на форме входа.
 *
 * Отказ по пределу неудачных попыток (ADR-056) говорит, сколько ждать:
 * «попробуйте позже» без срока человек проверяет каждую минуту и снова
 * упирается в тот же отказ. Остальное — общим правилом `errorMessageKey`.
 */
export function loginErrorText(error: unknown, t: (key: MessageKey) => string): string {
  if (isAppError(error) && error.code === ERROR_CODES.RATE_LIMITED) {
    const seconds = error.details?.retryAfterSeconds;

    if (typeof seconds === 'number' && seconds > 0) {
      return fill(t('login.rateLimited'), { minutes: String(Math.ceil(seconds / 60)) });
    }
  }

  return t(errorMessageKey(error));
}
