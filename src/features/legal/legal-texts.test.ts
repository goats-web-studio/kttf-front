import {
  ACCOUNT_DELETION_ANCHOR,
  LEGAL_DOCUMENTS,
  LEGAL_LANGUAGES,
  PRIVACY_POLICY_VERSION,
} from '@kttf/shared/types';
import { describe, expect, it } from 'vitest';

import { legalVersion, parseLegal } from './legal-markdown';
import { LEGAL_CONTACT_EMAIL, OPERATOR_BLOCK } from './operator';
import { loadLegalText } from './texts';

/**
 * Тексты документов — ADR-091. Переводы обязаны совпадать с подлинником по
 * устройству: те же разделы и якоря. Иначе ссылка `/privacy#account-deletion`
 * из стора приложений ведёт в никуда на одном из языков.
 */

function anchors(source: string): string[] {
  return [...source.matchAll(/\{#([a-z0-9-]+)\}/g)].map((match) => match[1] ?? '');
}

describe.each(LEGAL_DOCUMENTS)('документ %s', (doc) => {
  it.each(LEGAL_LANGUAGES)('%s: редакция совпадает с общей константой', async (lang) => {
    expect(legalVersion(await loadLegalText(doc, lang))).toBe(PRIVACY_POLICY_VERSION);
  });

  it.each(LEGAL_LANGUAGES)('%s: блок операторов один, адрес для обращений есть', async (lang) => {
    const source = await loadLegalText(doc, lang);

    expect(source.match(/^\{\{OPERATOR\}\}$/gm)).toHaveLength(1);
    expect(source).toContain('{{EMAIL}}');
  });

  it.each(LEGAL_LANGUAGES)('%s: разделы и якоря — как в подлиннике', async (lang) => {
    const ru = await loadLegalText(doc, 'ru');
    const translated = await loadLegalText(doc, lang);

    expect(anchors(translated)).toEqual(anchors(ru));
  });

  it.each(LEGAL_LANGUAGES)('%s: имена операторов — только в operator.ts', async (lang) => {
    const source = await loadLegalText(doc, lang);

    for (const name of ['Аманбаев', 'Гасанов', 'Amanbayev', 'Gasanov']) {
      expect(source).not.toContain(name);
    }
  });

  it.each(LEGAL_LANGUAGES)('%s: разбирается, название одно', async (lang) => {
    const parsed = parseLegal(
      await loadLegalText(doc, lang),
      OPERATOR_BLOCK[lang],
      LEGAL_CONTACT_EMAIL,
    );

    expect(parsed.title).not.toBe('');
    expect(parsed.blocks.length).toBeGreaterThan(10);
  });
});

describe('политика конфиденциальности', () => {
  it.each(LEGAL_LANGUAGES)('%s: есть раздел об удалении аккаунта', async (lang) => {
    expect(anchors(await loadLegalText('privacy', lang))).toContain(ACCOUNT_DELETION_ANCHOR);
  });
});
