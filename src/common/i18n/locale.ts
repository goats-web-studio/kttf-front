import { ru } from './ru';

/**
 * Языки интерфейса — в порядке переключателя.
 *
 * Казахский, английский и русский — по ТЗ 11; китайский, корейский и японский
 * добавлены 10.11.2026. Русский словарь эталонный: тип ключей обязывает
 * заполнить каждый словарь целиком.
 */
export const LOCALES = ['kk', 'en', 'ru', 'zh', 'ko', 'ja'] as const;

export type Locale = (typeof LOCALES)[number];

/** Казахский — основной язык платформы: порядок переключателя каз → англ → рус. */
export const DEFAULT_LOCALE: Locale = 'kk';

export type MessageKey = keyof typeof ru;

export type Dictionary = Readonly<Record<MessageKey, string>>;

/**
 * Словарь в основном бандле — только русский, эталонный (ADR-090).
 *
 * Остальные, включая казахский, грузятся отдельным чанком. Казахский раньше
 * лежал в основном бандле, чтобы у основного языка не мигал русский; но оба
 * словаря целиком (около 2 900 ключей каждый) уезжали и в набор офлайн-
 * консоли, и её бюджет 420 КБ gzip (`precache.test.ts`) кончился: любая
 * новая строка интерфейса в любой части сайта его превышала. Мигания нет и
 * так — провайдер ничего не рисует, пока словарь первого показа не пришёл, а
 * чанк лежит в precache и открывается без сети мгновенно.
 */
export const EAGER_DICTIONARIES: Readonly<Partial<Record<Locale, Dictionary>>> = { ru };

const LAZY: Readonly<Record<Locale, () => Promise<Dictionary>>> = {
  kk: () => import('./kk').then((module) => module.kk),
  ru: () => Promise.resolve(ru),
  en: () => import('./en').then((module) => module.en),
  zh: () => import('./zh').then((module) => module.zh),
  ko: () => import('./ko').then((module) => module.ko),
  ja: () => import('./ja').then((module) => module.ja),
};

export function loadDictionary(locale: Locale): Promise<Dictionary> {
  return LAZY[locale]();
}

/** Названия языков на самих языках: человек ищет свой язык, а не перевод его названия. */
export const LOCALE_NAMES: Readonly<Record<Locale, string>> = {
  kk: 'Қазақша',
  en: 'English',
  ru: 'Русский',
  zh: '中文',
  ko: '한국어',
  ja: '日本語',
};

export function isLocale(value: string): value is Locale {
  return LOCALES.some((locale) => locale === value);
}

/**
 * Выбирает язык по предпочтениям браузера.
 *
 * Чистая функция: `navigator` сюда не заглядывает, поэтому поведение
 * проверяемо. Разбирается и `kk-KZ`, и `kk` — браузеры отдают оба вида.
 */
export function detectLocale(preferences: readonly string[]): Locale {
  for (const preference of preferences) {
    const base = preference.toLowerCase().split('-')[0];

    if (base !== undefined && isLocale(base)) {
      return base;
    }
  }

  return DEFAULT_LOCALE;
}
