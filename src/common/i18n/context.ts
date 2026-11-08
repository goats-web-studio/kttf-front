import { createContext, use } from 'react';

import { DEFAULT_LOCALE, DICTIONARIES, type Locale, type MessageKey } from './locale';

export interface I18nValue {
  readonly locale: Locale;
  readonly t: (key: MessageKey) => string;
  readonly setLocale: (locale: Locale) => void;
}

function createValue(locale: Locale, setLocale: (locale: Locale) => void = () => undefined): I18nValue {
  const dictionary = DICTIONARIES[locale];

  return { locale, t: (key) => dictionary[key], setLocale };
}

export const I18nContext = createContext<I18nValue>(createValue(DEFAULT_LOCALE));

export { createValue as createI18nValue };

/**
 * Единственный способ получить пользовательскую строку.
 *
 * Захардкоженный текст в компоненте запрещён брифом 3.4, и здесь это не
 * пожелание: тип ключа не даст сослаться на строку, которой нет в словарях.
 */
export function useT(): (key: MessageKey) => string {
  return use(I18nContext).t;
}

export function useLocale(): Locale {
  return use(I18nContext).locale;
}

/** Смена языка из переключателя в шапке. */
export function useSetLocale(): (locale: Locale) => void {
  return use(I18nContext).setLocale;
}
