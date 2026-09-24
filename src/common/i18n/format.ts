import type { Locale } from './locale';

/**
 * Форматирование дат и денег по языку интерфейса.
 *
 * Через `Intl`, а не своей раскладкой: казахский и русский пишут дату
 * по-разному, и таблица с датами, собранная вручную, разойдётся с языком
 * страницы — бриф 3.4 требует, чтобы пользовательский текст шёл через
 * локализацию целиком, а не наполовину.
 */

/** Дата без времени: календарь и карточка турнира показывают день. */
export function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(iso));
}

/** Дата со временем: начало турнира назначается на час, а не на день. */
export function formatDateTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

/**
 * Взнос в тенге.
 *
 * Дробной части нет: взнос хранится целым числом тенге (ТЗ 4.2), и копейки
 * в нём означали бы, что значение пришло не из того поля.
 */
export function formatMoney(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'KZT',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Изменение рейтинга со знаком.
 *
 * Значение приходит строкой и строкой же показывается: разбор в число ради
 * одного знака — ровно тот способ потерять сотую долю, из-за которого
 * рейтинг и передаётся строкой (ADR-014). Знак минуса уже в строке, плюс
 * дописывается, ноль остаётся без знака.
 */
export function formatDelta(delta: string): string {
  if (delta.startsWith('-') || /^0(\.0+)?$/.test(delta)) {
    return delta;
  }

  return `+${delta}`;
}

/** Число записей: «1 248», с разрядами по языку интерфейса. */
export function formatCount(count: number, locale: Locale): string {
  return new Intl.NumberFormat(locale).format(count);
}

/**
 * Дата по частям — для даты-плашки в карточке турнира.
 *
 * День, месяц и время набираются разным кеглем, поэтому приходят раздельно.
 * Месяц короткий и берётся у `Intl`: «сент.» и «қыр.» пишутся по-разному.
 */
export function formatDateParts(
  iso: string,
  locale: Locale,
): { readonly day: string; readonly month: string; readonly time: string } {
  const date = new Date(iso);

  return {
    day: new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(date),
    month: new Intl.DateTimeFormat(locale, { month: 'short' }).format(date),
    time: new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(date),
  };
}
