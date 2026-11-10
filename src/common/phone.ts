/**
 * Казахстанский номер: +7 и десять цифр. На сервер уходит `+7XXXXXXXXXX`
 * (`PHONE_PATTERN` в общем коде), на экране — `+7 (701) 123-45-67`.
 */

/** Сколько цифр после +7. */
export const NATIONAL_LENGTH = 10;

/**
 * Цифры номера после кода страны из того, что человек ввёл или вставил.
 *
 * Понимает `+7 701…`, `8 701…`, `7701…` и голые десять цифр. Лишнее
 * обрезается: в поле не может оказаться больше десяти цифр.
 */
export function nationalDigits(raw: string): string {
  const trimmed = raw.trim();

  if (trimmed.startsWith('+7')) {
    return trimmed.slice(2).replace(/\D/g, '').slice(0, NATIONAL_LENGTH);
  }

  const digits = trimmed.replace(/\D/g, '');

  // Вставили номер целиком с восьмёркой или семёркой впереди.
  if (digits.length > NATIONAL_LENGTH && (digits.startsWith('8') || digits.startsWith('7'))) {
    return digits.slice(1, NATIONAL_LENGTH + 1);
  }

  return digits.slice(0, NATIONAL_LENGTH);
}

/** `7011234567` → `+7 (701) 123-45-67`; неполный номер — по набранному. */
export function formatPhone(national: string): string {
  if (national === '') return '';

  const area = national.slice(0, 3);
  const first = national.slice(3, 6);
  const second = national.slice(6, 8);
  const third = national.slice(8, 10);

  let result = `+7 (${area}`;
  if (national.length > 3) result += `) ${first}`;
  if (national.length > 6) result += `-${second}`;
  if (national.length > 8) result += `-${third}`;

  return result;
}

/** Номер для сервера или `null`, если он набран не полностью. */
export function toE164(display: string): string | null {
  const national = nationalDigits(display);

  return national.length === NATIONAL_LENGTH ? `+7${national}` : null;
}

/**
 * Позиция курсора после `count` цифр номера в отформатированной строке.
 * Код страны цифрой номера не считается.
 */
export function caretAfterDigits(formatted: string, count: number): number {
  if (count <= 0) return Math.min(formatted.length, 4);

  let seen = 0;

  for (let index = 2; index < formatted.length; index += 1) {
    if (/\d/.test(formatted[index] ?? '')) {
      seen += 1;

      if (seen === count) return index + 1;
    }
  }

  return formatted.length;
}

/** Сколько цифр номера (без кода страны) стоит до позиции курсора. */
export function digitsBefore(raw: string, caret: number): number {
  const head = raw.slice(0, caret);

  return head.startsWith('+7')
    ? head.slice(2).replace(/\D/g, '').length
    : head.replace(/\D/g, '').length;
}
