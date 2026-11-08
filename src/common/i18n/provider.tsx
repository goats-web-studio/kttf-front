import { type ReactNode, useMemo } from 'react';

import { createI18nValue, I18nContext } from './context';
import { type Locale } from './locale';

interface I18nProviderProps {
  readonly locale: Locale;
  readonly onLocaleChange?: (locale: Locale) => void;
  readonly children: ReactNode;
}

/**
 * Язык приходит параметром, а не берётся отсюда сам.
 *
 * Переключатель языка и сохранение выбора в профиле — задача локализации
 * (ТЗ 11). Здесь только доставка словаря до компонентов.
 */
export default function I18nProvider({
  locale,
  onLocaleChange,
  children,
}: I18nProviderProps): ReactNode {
  const value = useMemo(() => createI18nValue(locale, onLocaleChange), [locale, onLocaleChange]);

  return <I18nContext value={value}>{children}</I18nContext>;
}
