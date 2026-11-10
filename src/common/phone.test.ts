import { describe, expect, it } from 'vitest';

import { caretAfterDigits, formatPhone, nationalDigits, toE164 } from './phone';

describe('маска телефона', () => {
  it('понимает любой привычный способ записи', () => {
    for (const raw of [
      '+77011234567',
      '+7 (701) 123-45-67',
      '87011234567',
      '8 701 123 45 67',
      '7011234567',
    ]) {
      expect(nationalDigits(raw), raw).toBe('7011234567');
    }
  });

  it('первая семёрка в пустом поле — начало номера, а не код страны', () => {
    expect(nationalDigits('7')).toBe('7');
    expect(formatPhone(nationalDigits('7'))).toBe('+7 (7');
  });

  it('форматирует по мере набора', () => {
    expect(formatPhone('701')).toBe('+7 (701');
    expect(formatPhone('7011')).toBe('+7 (701) 1');
    expect(formatPhone('7011234')).toBe('+7 (701) 123-4');
    expect(formatPhone('7011234567')).toBe('+7 (701) 123-45-67');
    expect(formatPhone('')).toBe('');
  });

  it('лишние цифры не принимает', () => {
    expect(nationalDigits('+7 (701) 123-45-678')).toBe('7011234567');
  });

  it('на сервер — только полный номер', () => {
    expect(toE164('+7 (701) 123-45-67')).toBe('+77011234567');
    expect(toE164('+7 (701) 123-45')).toBeNull();
  });

  it('курсор встаёт после нужной цифры', () => {
    expect(caretAfterDigits('+7 (701) 123-45-67', 4)).toBe('+7 (701) 1'.length);
    expect(caretAfterDigits('+7 (701) 123-45-67', 10)).toBe('+7 (701) 123-45-67'.length);
  });
});
