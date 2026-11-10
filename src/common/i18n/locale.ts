import { kk } from './kk';
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
 * Словари в основном бандле: русский — эталонный, казахский — основной.
 * Остальные грузятся отдельным чанком при выборе языка: шесть словарей
 * разом не помещались в бюджет офлайн-консоли (`precache.test.ts`).
 */
export const EAGER_DICTIONARIES: Readonly<Partial<Record<Locale, Dictionary>>> = { ru, kk };

const LAZY: Readonly<Record<Locale, () => Promise<Dictionary>>> = {
  kk: () => Promise.resolve(kk),
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
