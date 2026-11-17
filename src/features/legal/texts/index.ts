import type { LegalDocument, LegalLanguage } from '@kttf/shared/types';

/**
 * Тексты документов — отдельными чанками (ADR-091): длинный текст не
 * ложится ни в словари (ADR-086), ни в основной бандл и консоль (ADR-004).
 */
const TEXTS: Readonly<
  Record<LegalDocument, Readonly<Record<LegalLanguage, () => Promise<{ default: string }>>>>
> = {
  privacy: {
    ru: () => import('./privacy.ru'),
    kk: () => import('./privacy.kk'),
    en: () => import('./privacy.en'),
  },
  terms: {
    ru: () => import('./terms.ru'),
    kk: () => import('./terms.kk'),
    en: () => import('./terms.en'),
  },
};

export async function loadLegalText(doc: LegalDocument, lang: LegalLanguage): Promise<string> {
  return (await TEXTS[doc][lang]()).default;
}
