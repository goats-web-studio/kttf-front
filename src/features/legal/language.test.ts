import { describe, expect, it } from 'vitest';

import { resolveLegalLanguage } from './language';

describe('язык документа — ADR-091', () => {
  it('русский — подлинник, без пометки', () => {
    expect(resolveLegalLanguage('ru')).toEqual({ lang: 'ru', note: null });
  });

  it('казахский и английский — переводы', () => {
    expect(resolveLegalLanguage('kk')).toEqual({ lang: 'kk', note: 'translation' });
    expect(resolveLegalLanguage('en')).toEqual({ lang: 'en', note: 'translation' });
  });

  it('без перевода — английский с пометкой', () => {
    for (const locale of ['zh', 'ko', 'ja'] as const) {
      expect(resolveLegalLanguage(locale)).toEqual({ lang: 'en', note: 'fallback' });
    }
  });

  it('язык из адреса важнее языка интерфейса', () => {
    expect(resolveLegalLanguage('zh', 'ru')).toEqual({ lang: 'ru', note: null });
    expect(resolveLegalLanguage('ru', 'kk')).toEqual({ lang: 'kk', note: 'translation' });
  });
});
