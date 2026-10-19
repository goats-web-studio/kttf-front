/**
 * Текст записи клуба — куски: простой текст и ссылки (ADR-055, решение 8).
 *
 * Запись хранится простым текстом, без HTML и Markdown: так в неё нельзя
 * вставить скрипт. Ссылки становятся кликабельными здесь, на показе.
 * Знак препинания в конце ссылки — конец предложения, а не часть адреса.
 */
export type TextPart =
  | { readonly kind: 'text'; readonly value: string }
  | { readonly kind: 'link'; readonly value: string };

const URL_PATTERN = /https?:\/\/[^\s<>"«»]+/g;
const TRAILING = /[.,;:!?)\]]+$/;

export function textParts(text: string): readonly TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const raw = match[0];
    const url = raw.replace(TRAILING, '');
    const start = match.index;

    if (start > last) parts.push({ kind: 'text', value: text.slice(last, start) });

    parts.push({ kind: 'link', value: url });
    last = start + url.length;
  }

  if (last < text.length) parts.push({ kind: 'text', value: text.slice(last) });

  return parts;
}
