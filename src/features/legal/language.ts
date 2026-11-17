import type { LegalLanguage } from '@kttf/shared/types';

import type { Locale } from '@/common/i18n';

/** Пометка над текстом: перевод или английский вместо непереведённого языка. */
export type LegalNote = 'translation' | 'fallback' | null;

/**
 * Язык документа по языку интерфейса — ADR-091. Русский — подлинник.
 * Казахский и английский — переводы. Для китайского, корейского и японского
 * перевода нет: показывается английский с пометкой.
 */
export function resolveLegalLanguage(
  locale: Locale,
  override?: LegalLanguage,
): { lang: LegalLanguage; note: LegalNote } {
  if (override !== undefined) {
    return { lang: override, note: override === 'ru' ? null : 'translation' };
  }

  switch (locale) {
    case 'ru':
      return { lang: 'ru', note: null };
    case 'kk':
    case 'en':
      return { lang: locale, note: 'translation' };
    default:
      return { lang: 'en', note: 'fallback' };
  }
}
