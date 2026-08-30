import { kk } from './kk';
import { ru } from './ru';

/**
 * Языки интерфейса.
 *
 * ТЗ 11 называет три: казахский, русский, английский. Английского здесь пока
 * нет — он последний в очереди наполнения, а критерий готовности MVP требует
 * русского и казахского. Добавление третьего словаря не меняет ничего, кроме
 * этого файла: тип ключей уже обязывает заполнить его целиком.
 */
export const LOCALES = ['ru', 'kk'] as const;

export type Locale = (typeof LOCALES)[number];

/** Русский первый по ТЗ 11: «приоритет наполнения — русский → казахский». */
export const DEFAULT_LOCALE: Locale = 'ru';

export type MessageKey = keyof typeof ru;

export const DICTIONARIES: Readonly<Record<Locale, Readonly<Record<MessageKey, string>>>> = {
  ru,
  kk,
};

function isLocale(value: string): value is Locale {
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
