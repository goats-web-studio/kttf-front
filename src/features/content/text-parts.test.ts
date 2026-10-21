import { describe, expect, it } from 'vitest';

import { textParts } from './text-parts';

describe('текст записи клуба', () => {
  it('ссылки отдельно, точка в конце предложения — не часть адреса', () => {
    expect(textParts('Запись на https://club.kz/kids. Ждём!')).toEqual([
      { kind: 'text', value: 'Запись на ' },
      { kind: 'link', value: 'https://club.kz/kids' },
      { kind: 'text', value: '. Ждём!' },
    ]);
  });

  it('текст без ссылок — один кусок, ссылка без текста — тоже', () => {
    expect(textParts('Просто текст')).toEqual([{ kind: 'text', value: 'Просто текст' }]);
    expect(textParts('http://a.kz')).toEqual([{ kind: 'link', value: 'http://a.kz' }]);
  });

  it('разметка не становится ссылкой: javascript: и голый домен — текст', () => {
    expect(textParts('javascript:alert(1) и club.kz')).toEqual([
      { kind: 'text', value: 'javascript:alert(1) и club.kz' },
    ]);
  });
});
