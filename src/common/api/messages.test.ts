import { ERROR_CODES } from '@kttf/shared/errors';
import { describe, expect, it } from 'vitest';

import { DICTIONARIES, LOCALES } from '@/common/i18n/locale';

import { ERROR_MESSAGE_KEYS } from './messages';

describe('тексты ошибок', () => {
  it('каждому коду из общего кода соответствует строка на каждом языке', () => {
    // Коды приходят из kttf-shared и растут вместе с доменом. Без этой
    // проверки новый код доезжает до пользователя английским диагностическим
    // сообщением сервера, что запрещено брифом 3.4.
    for (const code of Object.values(ERROR_CODES)) {
      const key = ERROR_MESSAGE_KEYS[code];

      expect(key, `код ${code} без текста`).toBeDefined();

      for (const locale of LOCALES) {
        expect(DICTIONARIES[locale][key].trim(), `${locale}: ${code}`).not.toBe('');
      }
    }
  });

  it('лишних кодов нет', () => {
    expect(Object.keys(ERROR_MESSAGE_KEYS).sort()).toEqual(Object.values(ERROR_CODES).sort());
  });
});
