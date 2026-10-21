import type { Locale } from './locale';

/**
 * Форматирование дат и денег по языку интерфейса.
 *
 * Через `Intl`, а не своей раскладкой: казахский и русский пишут дату
 * по-разному, и таблица с датами, собранная вручную, разойдётся с языком
 * страницы — бриф 3.4 требует, чтобы пользовательский текст шёл через
 * локализацию целиком, а не наполовину.
 */

/**
 * Дата без времени: календарь и карточка турнира показывают день.
 *
 * Год — только если не текущий (docs/07-design-system.md, 10.2): «12 марта»,
 * а не «12 марта 2026 г.» в каждой строке истории встреч.
 */
export function formatDate(iso: string, locale: Locale, now: Date = new Date()): string {
  const date = new Date(iso);

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  }).format(date);
}

/** Дата со временем: начало турнира назначается на час, а не на день. */
export function formatDateTime(iso: string, locale: Locale, now: Date = new Date()): string {
  const date = new Date(iso);

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
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
    // Знак ₸, а не код KZT (docs/07-design-system.md, 10.2): без этого
    // Chromium пишет «3 000 KZT».
    currencyDisplay: 'narrowSymbol',
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
  // Сервер может прислать прирост уже со знаком («+42.10», ADR-059): второй
  // плюс не дописывается.
  const value = padHundredths(delta.replace(/^\+/, ''));

  if (value.startsWith('-') || /^0(\.0+)?$/.test(value)) {
    return value;
  }

  return `+${value}`;
}

/**
 * Два знака после точки: «-7.90», а не «-7.9» (07, 10.2).
 *
 * Сервер отдаёт `Decimal` строкой, и ноль на конце в ней теряется. Дописывается
 * он работой со строкой, а не через `Number`: разбор в число ради показа — тот
 * способ потерять сотую долю, от которого значение и передаётся строкой
 * (ADR-014). Больше двух знаков не обрезается. Неразбираемое — как есть.
 */
function padHundredths(value: string): string {
  const match = /^(-?\d+)(?:\.(\d*))?$/.exec(value);

  if (match === null) {
    return value;
  }

  const [, whole = '', fraction = ''] = match;

  return `${whole}.${fraction.padEnd(2, '0')}`;
}

/**
 * Рейтинг — целым: «384», а не «384.10» (ADR-053).
 *
 * Сотые остаются в журнале и в начислениях за встречу (`formatDelta`), а сам
 * рейтинг, как у RTTF, читается целым. Округление до ближайшего, половина —
 * от нуля: «421.50» → «422». Считается по первой цифре дробной части, без
 * разбора всей строки в число. Неразбираемое значение показывается как есть.
 */
export function formatRating(value: string): string {
  const match = /^(-?)(\d+)(?:\.(\d*))?$/.exec(value);

  if (match === null) {
    return value;
  }

  const [, sign = '', whole = '', fraction = ''] = match;
  const rounded = Number(whole) + ((fraction[0] ?? '0') >= '5' ? 1 : 0);

  return rounded === 0 ? '0' : `${sign}${String(rounded)}`;
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
 * Год — только если не текущий (docs/07-design-system.md, 10.2).
 */
export function formatDateParts(
  iso: string,
  locale: Locale,
  now: Date = new Date(),
): {
  readonly day: string;
  readonly month: string;
  readonly year: string | undefined;
  readonly time: string;
} {
  const date = new Date(iso);

  return {
    day: new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(date),
    month: new Intl.DateTimeFormat(locale, { month: 'short' }).format(date),
    year:
      date.getFullYear() === now.getFullYear()
        ? undefined
        : new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(date),
    time: new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(date),
  };
}

/**
 * День из поля даты (`2026-09-01`) — в момент начала этих суток по часам
 * человека.
 *
 * `new Date('2026-09-01')` читается как полночь по UTC, а в Казахстане это
 * пять утра: турнир в три часа ночи выпал бы из выборки своего дня.
 */
export function startOfDay(day: string): Date {
  return new Date(`${day}T00:00:00`);
}

/** Последний миг тех же суток по часам человека. */
export function endOfDay(day: string): Date {
  return new Date(`${day}T23:59:59.999`);
}

/**
 * Подстановка в строку словаря: `fill(t('common.pageOf'), { page, pages })`.
 *
 * Фраза с числом внутри собирается целиком в словаре, а не склейкой кусков
 * в компоненте: в казахском порядок слов другой, и «Страница 2 из 7»,
 * склеенная по-русски, по-казахски не читается.
 */
export function fill(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match);
}

/** Время начала встречи: «20:05». День уже стоит в шапке турнира. */
export function formatTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );
}

/** Шаг делений оси времени на графике рейтинга. */
export type TimeTickUnit = 'year' | 'month' | 'day';

/**
 * Подпись деления оси времени: «2026», «мар.», «5 мар.».
 *
 * Год — числом, без «г.» и «ж.» от `Intl`: под осью он стоит отдельной
 * строкой, и хвост сокращения в узкой подписи только мешает.
 */
export function formatTimeTick(time: number, unit: TimeTickUnit, locale: Locale): string {
  const date = new Date(time);

  if (unit === 'year') {
    return String(date.getFullYear());
  }

  return new Intl.DateTimeFormat(
    locale,
    unit === 'month' ? { month: 'short' } : { day: 'numeric', month: 'short' },
  ).format(date);
}

/**
 * Заголовок месяца календаря: «Октябрь 2026».
 *
 * Месяц в именительном падеже (`month: 'long'` без числа даёт «октябрь», а
 * не «октября»), год — числом, без «г.»: заголовок, а не дата в тексте.
 */
export function formatMonthTitle(date: Date, locale: Locale): string {
  const month = new Intl.DateTimeFormat(locale, { month: 'long' }).format(date);

  return `${month.charAt(0).toLocaleUpperCase(locale)}${month.slice(1)} ${String(date.getFullYear())}`;
}

/** День недели: «пн» в шапке календаря, «понедельник» в заголовке дня. */
export function formatWeekday(date: Date, locale: Locale, width: 'short' | 'long'): string {
  return new Intl.DateTimeFormat(locale, { weekday: width }).format(date);
}
