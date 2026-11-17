import { describe, expect, it } from 'vitest';

import { legalVersion, parseInline, parseLegal } from './legal-markdown';

describe('разметка документов — ADR-091', () => {
  const source = [
    '<!-- version: 2026-11-17 -->',
    '# Политика',
    '',
    '## 1. Кто мы {#operator}',
    '',
    '{{OPERATOR}}',
    '',
    '### Подраздел',
    '',
    'Первая строка',
    'и её продолжение.',
    '',
    '- один',
    '- два',
    '',
    '1. первый',
    '2. второй',
  ].join('\n');

  it('название, редакция, заголовки с якорями и без', () => {
    const doc = parseLegal(source, '**Оператор:** {{EMAIL}}', 'a@b.kz');

    expect(doc.title).toBe('Политика');
    expect(doc.version).toBe('2026-11-17');
    expect(doc.blocks[0]).toMatchObject({ kind: 'h2', id: 'operator' });
    expect(doc.blocks.find((block) => block.kind === 'h3')).toMatchObject({ id: null });
  });

  it('блок операторов и адрес подставляются, строки абзаца склеиваются', () => {
    const doc = parseLegal(source, '**Оператор:** {{EMAIL}}', 'a@b.kz');

    expect(doc.blocks[1]).toEqual({
      kind: 'p',
      content: [
        { kind: 'bold', text: 'Оператор:' },
        { kind: 'text', text: ' ' },
        { kind: 'link', text: 'a@b.kz', href: 'mailto:a@b.kz' },
      ],
    });
    expect(doc.blocks).toContainEqual({
      kind: 'p',
      content: [{ kind: 'text', text: 'Первая строка и её продолжение.' }],
    });
  });

  it('маркированный и нумерованный списки — разные блоки', () => {
    const doc = parseLegal(source, '', 'a@b.kz');
    const lists = doc.blocks.filter((block) => block.kind === 'ul' || block.kind === 'ol');

    expect(lists.map((block) => block.kind)).toEqual(['ul', 'ol']);
  });

  it('ссылки: свои страницы, https и почта; чужая схема — простой текст', () => {
    expect(parseInline('[a](/privacy#x)', 'e')).toEqual([
      { kind: 'link', text: 'a', href: '/privacy#x' },
    ]);
    expect(parseInline('[b](https://kttf.kz)', 'e')[0]).toMatchObject({ kind: 'link' });
    expect(parseInline('[c](mailto:x@y.kz)', 'e')[0]).toMatchObject({ kind: 'link' });
    expect(parseInline('[злой](javascript:alert(1))', 'e')[0]).toEqual({
      kind: 'text',
      text: 'злой',
    });
  });

  it('без служебной строки редакции нет', () => {
    expect(legalVersion('# Текст')).toBeNull();
  });
});
