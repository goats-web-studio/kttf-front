import { AppError } from '@kttf/shared/errors';
import { describe, expect, it } from 'vitest';

import { ru } from '@/common/i18n/ru';

import { loginErrorText } from './login-error';

const t = (key: keyof typeof ru): string => ru[key];

describe('отказ на форме входа', () => {
  it('предел попыток — со сроком в минутах, округлённым вверх', () => {
    const error = new AppError('RATE_LIMITED', 'x', { retryAfterSeconds: 61 });

    expect(loginErrorText(error, t)).toBe(
      'Слишком много неудачных попыток. Попробуйте через 2 мин.',
    );
  });

  it('без срока и прочие отказы — общим текстом', () => {
    expect(loginErrorText(new AppError('RATE_LIMITED', 'x'), t)).toBe(
      ru['error.api.RATE_LIMITED'],
    );
    expect(loginErrorText(new AppError('UNAUTHORIZED', 'x'), t)).toBe(
      ru['error.api.UNAUTHORIZED'],
    );
  });
});
