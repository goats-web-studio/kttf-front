/**
 * Телефон с кодом страны.
 *
 * На сервер уходит E.164 (`+77011234567`, `PHONE_PATTERN` в общем коде), на
 * экране — код страны и номер по маске страны: `+7 (701) 123-45-67`,
 * `+998 90 123-45-67`. Страны — те, откуда реально приходят игроки:
 * Казахстан, соседи по региону и страны большого тенниса.
 */

export interface PhoneCountry {
  /** ISO 3166-1 alpha-2 — название страны берётся из `Intl.DisplayNames`. */
  readonly iso: string;
  /** Код страны без плюса. */
  readonly dial: string;
  /** Маска национального номера: `#` — цифра. Длина номера — число `#`. */
  readonly mask: string;
  /**
   * Цифра, которой номер привычно начинают внутри страны вместо кода:
   * «8 701…» в Казахстане, «0 10…» в Корее. Набранная первой, она не
   * становится цифрой номера.
   */
  readonly trunk: string;
}

/** Казахстан — страна по умолчанию. */
export const DEFAULT_COUNTRY: PhoneCountry = {
  iso: 'KZ',
  dial: '7',
  mask: '(###) ###-##-##',
  trunk: '8',
};

export const PHONE_COUNTRIES: readonly PhoneCountry[] = [
  DEFAULT_COUNTRY,
  { iso: 'RU', dial: '7', mask: '(###) ###-##-##', trunk: '8' },
  { iso: 'UZ', dial: '998', mask: '## ###-##-##', trunk: '' },
  { iso: 'KG', dial: '996', mask: '### ###-###', trunk: '0' },
  { iso: 'TJ', dial: '992', mask: '## ###-####', trunk: '' },
  { iso: 'TM', dial: '993', mask: '## ##-##-##', trunk: '8' },
  { iso: 'AZ', dial: '994', mask: '## ###-##-##', trunk: '0' },
  { iso: 'AM', dial: '374', mask: '## ###-###', trunk: '0' },
  { iso: 'GE', dial: '995', mask: '### ##-##-##', trunk: '0' },
  { iso: 'BY', dial: '375', mask: '## ###-##-##', trunk: '' },
  { iso: 'UA', dial: '380', mask: '## ###-##-##', trunk: '0' },
  { iso: 'MN', dial: '976', mask: '####-####', trunk: '' },
  { iso: 'TR', dial: '90', mask: '(###) ###-##-##', trunk: '0' },
  { iso: 'CN', dial: '86', mask: '### ####-####', trunk: '' },
  { iso: 'KR', dial: '82', mask: '##-####-####', trunk: '0' },
  { iso: 'JP', dial: '81', mask: '##-####-####', trunk: '0' },
  { iso: 'DE', dial: '49', mask: '### ########', trunk: '0' },
  { iso: 'GB', dial: '44', mask: '#### ######', trunk: '0' },
  { iso: 'US', dial: '1', mask: '(###) ###-####', trunk: '' },
];

const BY_ISO = new Map(PHONE_COUNTRIES.map((country) => [country.iso, country]));

export function countryByIso(iso: string): PhoneCountry {
  return BY_ISO.get(iso) ?? DEFAULT_COUNTRY;
}

/** Сколько цифр в номере страны. */
export function nationalLength(country: PhoneCountry): number {
  return country.mask.replace(/[^#]/g, '').length;
}

/**
 * Страна и цифры номера из записи с кодом страны (`+998 90 …`, `+7701…`).
 * `null` — запись без плюса или код, которого нет в списке.
 *
 * У Казахстана и России общий код +7: казахстанские номера начинаются с 6
 * или 7, остальные — российские.
 */
export function parsePhone(value: string): { country: PhoneCountry; national: string } | null {
  const trimmed = value.trim();

  if (!trimmed.startsWith('+')) return null;

  const digits = trimmed.replace(/\D/g, '');
  const matches = PHONE_COUNTRIES.filter((country) => digits.startsWith(country.dial));
  const longest = Math.max(0, ...matches.map((country) => country.dial.length));
  const candidates = matches.filter((country) => country.dial.length === longest);
  const first = candidates[0];

  if (first === undefined) return null;

  const national = digits.slice(longest);
  const kazakh = national === '' || /^[67]/.test(national);
  const country =
    candidates.length > 1
      ? (candidates.find((item) => item.iso === (kazakh ? 'KZ' : 'RU')) ?? first)
      : first;

  return { country, national: national.slice(0, nationalLength(country)) };
}

/**
 * Цифры номера из того, что набрали в поле номера (без кода страны).
 *
 * Первая «8» в Казахстане или «0» в Корее — привычная замена кода, а не
 * цифра номера. Номер, вставленный целиком с кодом страны без плюса
 * («77011234567»), тоже понимается.
 */
export function nationalDigits(country: PhoneCountry, raw: string): string {
  let digits = raw.replace(/\D/g, '');
  const length = nationalLength(country);

  if (country.trunk !== '' && digits.startsWith(country.trunk)) {
    digits = digits.slice(country.trunk.length);
  } else if (digits.length > length && digits.startsWith(country.dial)) {
    digits = digits.slice(country.dial.length);
  }

  return digits.slice(0, length);
}

/** Номер по маске страны; неполный — по набранному, без хвоста маски. */
export function formatNational(country: PhoneCountry, digits: string): string {
  let result = '';
  let used = 0;

  for (const char of country.mask) {
    if (used >= digits.length) break;

    if (char === '#') {
      result += digits[used] ?? '';
      used += 1;
    } else {
      result += char;
    }
  }

  return result;
}

/** Полная запись для формы: `+998 90 123-45-67`; пустой номер — пустая строка. */
export function formatPhone(country: PhoneCountry, digits: string): string {
  return digits === '' ? '' : `+${country.dial} ${formatNational(country, digits)}`;
}

/** Номер для сервера (E.164) или `null`, если он набран не полностью. */
export function toE164(value: string): string | null {
  const parsed = parsePhone(value);

  if (parsed === null) return null;
  if (parsed.national.length !== nationalLength(parsed.country)) return null;

  return `+${parsed.country.dial}${parsed.national}`;
}

/** Позиция курсора после `count` цифр в номере, набранном по маске. */
export function caretAfterDigits(formatted: string, count: number): number {
  if (count <= 0) return 0;

  let seen = 0;

  for (let index = 0; index < formatted.length; index += 1) {
    if (/\d/.test(formatted[index] ?? '')) {
      seen += 1;

      if (seen === count) return index + 1;
    }
  }

  return formatted.length;
}

/** Сколько цифр стоит до позиции курсора. */
export function digitsBefore(raw: string, caret: number): number {
  return raw.slice(0, caret).replace(/\D/g, '').length;
}
