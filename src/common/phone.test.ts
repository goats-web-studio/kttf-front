import { describe, expect, it } from 'vitest';

import {
  caretAfterDigits,
  countryByIso,
  formatNational,
  formatPhone,
  nationalDigits,
  parsePhone,
  toE164,
  type PhoneCountry,
} from './phone';

const KZ = countryByIso('KZ');
const UZ = countryByIso('UZ');
const KR = countryByIso('KR');

/** Набор по одной цифре — так, как это делает поле. */
function typeDigits(country: PhoneCountry, keys: string): string {
  let national = '';

  for (const key of keys) {
    national = nationalDigits(country, formatNational(country, national) + key);
  }

  return formatPhone(country, national);
}

describe('телефон с кодом страны', () => {
  it('казахстанский номер понимается в любой привычной записи', () => {
    for (const raw of ['7011234567', '87011234567', '8 701 123 45 67', '77011234567']) {
      expect(nationalDigits(KZ, raw), raw).toBe('7011234567');
    }
  });

  it('набор по цифре: «8» впереди — это код страны, а не цифра номера', () => {
    expect(typeDigits(KZ, '87011234567')).toBe('+7 (701) 123-45-67');
    expect(typeDigits(KZ, '7011234567')).toBe('+7 (701) 123-45-67');
  });

  it('маска своя у каждой страны', () => {
    expect(typeDigits(UZ, '901234567')).toBe('+998 90 123-45-67');
    // В Корее мобильный набирают с «0»: 010-1234-5678.
    expect(typeDigits(KR, '01012345678')).toBe('+82 10-1234-5678');
  });

  it('неполный номер — без хвоста маски', () => {
    expect(formatPhone(KZ, '7011')).toBe('+7 (701) 1');
    expect(formatPhone(KZ, '')).toBe('');
  });

  it('страна определяется по коду; +7 — Казахстан или Россия по первой цифре', () => {
    expect(parsePhone('+998901234567')?.country.iso).toBe('UZ');
    expect(parsePhone('+77011234567')?.country.iso).toBe('KZ');
    expect(parsePhone('+79161234567')?.country.iso).toBe('RU');
    expect(parsePhone('7011234567')).toBeNull();
  });

  it('на сервер — только полный номер в E.164', () => {
    expect(toE164('+7 (701) 123-45-67')).toBe('+77011234567');
    expect(toE164('+998 90 123-45-67')).toBe('+998901234567');
    expect(toE164('+7 (701) 123-45')).toBeNull();
    expect(toE164('')).toBeNull();
  });

  it('курсор встаёт после нужной цифры', () => {
    expect(caretAfterDigits('(701) 123-45-67', 4)).toBe('(701) 1'.length);
    expect(caretAfterDigits('(701) 123-45-67', 10)).toBe('(701) 123-45-67'.length);
  });
});
