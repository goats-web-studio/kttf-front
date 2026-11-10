import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { createI18nValue, I18nContext } from './context';
import { DEFAULT_LOCALE, EAGER_DICTIONARIES, loadDictionary, type Locale } from './locale';

interface I18nProviderProps {
  readonly locale: Locale;
  readonly onLocaleChange?: (locale: Locale) => void;
  readonly children: ReactNode;
}

/**
 * Доставка словаря до компонентов.
 *
 * Язык приходит параметром. Словарь не из основного бандла сначала
 * догружается; до этого остаётся прежний язык, а не пустые строки.
 */
export default function I18nProvider({
  locale,
  onLocaleChange,
  children,
}: I18nProviderProps): ReactNode {
  const [loaded, setLoaded] = useState(EAGER_DICTIONARIES);
  const [shown, setShown] = useState<Locale>(
    EAGER_DICTIONARIES[locale] === undefined ? DEFAULT_LOCALE : locale,
  );

  // Смена показанного языка прямо при отрисовке — без лишнего прохода эффекта.
  if (loaded[locale] !== undefined && shown !== locale) {
    setShown(locale);
  }

  useEffect(() => {
    if (loaded[locale] !== undefined) {
      return undefined;
    }

    let live = true;

    void loadDictionary(locale).then((dictionary) => {
      if (live) {
        setLoaded((previous) => ({ ...previous, [locale]: dictionary }));
      }
    });

    return () => {
      live = false;
    };
  }, [locale, loaded]);

  const active = loaded[locale] === undefined ? shown : locale;
  const dictionary = loaded[active] ?? EAGER_DICTIONARIES[DEFAULT_LOCALE];
  const value = useMemo(
    () => (dictionary === undefined ? null : createI18nValue(active, dictionary, onLocaleChange)),
    [active, dictionary, onLocaleChange],
  );

  return value === null ? null : <I18nContext value={value}>{children}</I18nContext>;
}
