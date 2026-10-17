/**
 * Логин или телефон человека — в вид, который ищет сервер.
 *
 * Сервер отличает телефон от логина по формату `+7XXXXXXXXXX` (ADR-034,
 * ADR-043). Владелец клуба вписывает номер как привык — «8 701 123 45 67»
 * или «+7 (701) 123-45-67», — и без приведения такой номер искался бы как
 * логин и не находился. Всё, что не похоже на номер, остаётся логином.
 */
export function toIdentifier(value: string): string {
  const trimmed = value.trim();

  if (!/^[+\d\s()-]+$/.test(trimmed)) {
    return trimmed;
  }

  const digits = trimmed.replace(/\D/g, '');

  if (digits.length === 10) {
    return `+7${digits}`;
  }
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return `+7${digits.slice(1)}`;
  }

  return trimmed;
}
