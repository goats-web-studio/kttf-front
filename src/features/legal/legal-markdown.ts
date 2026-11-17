/**
 * Разметка юридических документов — ADR-091.
 *
 * Маленький диалект Markdown, ровно на то, что нужно документам: заголовки с
 * якорями, абзацы, списки, жирный текст и ссылки. Разбор — в данные, а не в
 * HTML: вывод собирается компонентами React, без `dangerouslySetInnerHTML`,
 * и CSP остаётся прежней. Библиотека Markdown ради двух текстов не нужна.
 *
 * - `<!-- … -->` — служебная строка, в тексте не видна (редакция документа);
 * - `# Заголовок` — название документа, ровно один;
 * - `## Раздел {#якорь}`, `### Подраздел` — якорь необязателен;
 * - абзацы — через пустую строку; `- ` и `1. ` — списки;
 * - `**жирный**`, `[текст](адрес)` — адрес только `https://`, `mailto:` или `/…`;
 * - строка `{{OPERATOR}}` — блок операторов, `{{EMAIL}}` — адрес для обращений.
 */

export type Inline =
  | { readonly kind: 'text' | 'bold'; readonly text: string }
  | { readonly kind: 'link'; readonly text: string; readonly href: string };

export type Block =
  | { readonly kind: 'h2' | 'h3'; readonly id: string | null; readonly content: readonly Inline[] }
  | { readonly kind: 'p'; readonly content: readonly Inline[] }
  | { readonly kind: 'ul' | 'ol'; readonly items: readonly (readonly Inline[])[] };

export interface LegalDoc {
  readonly title: string;
  readonly version: string | null;
  readonly blocks: readonly Block[];
}

const VERSION = /<!--\s*version:\s*([0-9-]+)\s*-->/;
const HEADING = /^(#{2,3}) (.+?)(?: \{#([a-z0-9-]+)\})?$/;
const BULLET = /^- (.+)$/;
const NUMBERED = /^\d+\. (.+)$/;
const INLINE = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|\{\{EMAIL\}\}/g;
const SAFE_HREF = /^(https:\/\/|mailto:|\/)/;

/** Редакция документа из служебной строки. `null` — строки нет. */
export function legalVersion(source: string): string | null {
  return VERSION.exec(source)?.[1] ?? null;
}

export function parseLegal(source: string, operatorBlock: string, email: string): LegalDoc {
  const lines = source
    .split('\n')
    .flatMap((line) => (line.trim() === '{{OPERATOR}}' ? operatorBlock.split('\n') : [line]));

  let title = '';
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { kind: 'ul' | 'ol'; items: Inline[][] } | null = null;

  const flush = (): void => {
    if (paragraph.length > 0) {
      blocks.push({ kind: 'p', content: parseInline(paragraph.join(' '), email) });
      paragraph = [];
    }
    if (list !== null) {
      blocks.push(list);
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (line.startsWith('<!--')) continue;
    if (line === '') {
      flush();
      continue;
    }

    if (line.startsWith('# ')) {
      flush();
      title = line.slice(2).trim();
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading !== null) {
      flush();
      blocks.push({
        kind: heading[1] === '##' ? 'h2' : 'h3',
        id: heading[3] ?? null,
        content: parseInline(heading[2] ?? '', email),
      });
      continue;
    }

    const bullet = BULLET.exec(line);
    const numbered = bullet === null ? NUMBERED.exec(line) : null;
    const item = bullet ?? numbered;
    if (item !== null) {
      const kind = bullet === null ? 'ol' : 'ul';
      if (paragraph.length > 0 || (list !== null && list.kind !== kind)) flush();
      list ??= { kind, items: [] };
      list.items.push(parseInline(item[1] ?? '', email));
      continue;
    }

    if (list !== null) flush();
    paragraph.push(line);
  }

  flush();

  return { title, version: legalVersion(source), blocks };
}

export function parseInline(text: string, email: string): Inline[] {
  const result: Inline[] = [];
  let last = 0;

  for (const match of text.matchAll(INLINE)) {
    const start = match.index;
    if (start > last) result.push({ kind: 'text', text: text.slice(last, start) });

    const [whole, bold, label, href] = match;
    if (bold !== undefined) {
      result.push({ kind: 'bold', text: bold });
    } else if (label !== undefined && href !== undefined) {
      // Адрес не из списка разрешённых — простой текст, а не ссылка:
      // `javascript:` в документе не исполнится ни при какой ошибке в тексте.
      result.push(
        SAFE_HREF.test(href) ? { kind: 'link', text: label, href } : { kind: 'text', text: label },
      );
    } else {
      result.push({ kind: 'link', text: email, href: `mailto:${email}` });
    }

    last = start + whole.length;
  }

  if (last < text.length) result.push({ kind: 'text', text: text.slice(last) });

  return result;
}
