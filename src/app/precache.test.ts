// @vitest-environment node

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

import { build } from 'vite';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Precache чанков консоли — ADR-004, ТС 8.1.
 *
 * Ленивый чанк, не предзагруженный service worker'ом, в офлайне недоступен:
 * судья откроет консоль в зале без сети и получит пустой экран. Это самый
 * вероятный способ сломать офлайн-режим в единой сборке, и ADR-004 требует
 * закрыть его тестом.
 *
 * Проверяется собранный набор, а не конфигурация: `globPatterns` можно
 * оставить прежним и всё равно потерять чанк — например, вынеся консоль
 * в отдельную точку входа или превысив `maximumFileSizeToCacheInBytes`,
 * при котором Workbox молча выбрасывает файл из манифеста.
 *
 * Сборку тест поднимает сам, во временный каталог: пропуск при отсутствии
 * `dist` означал бы зелёный прогон, ничего не проверивший, а CI, который
 * собрал бы заранее, в репозитории нет. Сборка занимает несколько секунд.
 *
 * Состав чанков консоли берётся из манифеста сборки, а не из имён файлов:
 * страница проведения турнира собирается в `_tournamentId-*.js`, слова
 * «console» в имени нет, и фильтр по имени её не видит.
 */

/** Бюджет набора чанков консоли, ADR-004. */
const BUDGET_GZIP_BYTES = 400 * 1024;

/** Временный каталог сборки: в `dist` лежит то, что собрал человек. */
const OUT_DIR = resolve(process.cwd(), 'node_modules/.tmp/precache');

/** Запись манифеста сборки — то, что от неё нужно этому тесту. */
interface ManifestChunk {
  file: string;
  imports?: string[];
  css?: string[];
}

let manifest: Record<string, ManifestChunk>;
let precached: string[];
let emitted: string[];

/** Файлы каталога сборки, путями от его корня. */
function walk(dir: string, prefix = ''): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? walk(resolve(dir, entry.name), `${prefix}${entry.name}/`)
      : [`${prefix}${entry.name}`],
  );
}

/**
 * Замыкание чанков, без которых консоль не откроется: сами маршруты консоли
 * и всё, что они импортируют статически, вместе со стилями.
 */
function consoleClosure(): string[] {
  const roots = Object.keys(manifest).filter((key) => key.startsWith('src/routes/console'));

  // Пустой список означал бы, что маршруты консоли перестали выделяться
  // в отдельные чанки, и тест молча проверял бы пустоту.
  expect(roots.length).toBeGreaterThan(0);

  const seen = new Set<string>();
  const visit = (key: string): void => {
    const chunk = manifest[key];
    if (!chunk || seen.has(key)) return;
    seen.add(key);
    for (const imported of chunk.imports ?? []) visit(imported);
  };
  roots.forEach(visit);

  return [...seen].flatMap((key) => {
    const chunk = manifest[key];
    return chunk ? [chunk.file, ...(chunk.css ?? [])] : [];
  });
}

beforeAll(async () => {
  // Плагин маршрутов предупреждает о тестовых файлах рядом с маршрутами.
  // В прогоне тестов это шум, ради которого не стоит трогать конфигурацию.
  const warn = console.warn;
  // Workbox выбирает сборку service worker'а по `NODE_ENV`, а vitest ставит
  // туда `test`. Без подмены собирался бы отладочный service worker — не тот,
  // который приедет в зал.
  const nodeEnv = process.env.NODE_ENV;
  console.warn = () => undefined;
  process.env.NODE_ENV = 'production';
  try {
    await build({
      logLevel: 'silent',
      mode: 'production',
      // Манифест даёт соответствие исходных модулей чанкам. Конфигурацию
      // сборки это не меняет: параметр живёт только внутри теста.
      build: { outDir: OUT_DIR, manifest: true, emptyOutDir: true },
    });
  } finally {
    console.warn = warn;
    process.env.NODE_ENV = nodeEnv;
  }

  const parsed: unknown = JSON.parse(readFileSync(resolve(OUT_DIR, '.vite/manifest.json'), 'utf8'));
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('манифест сборки нечитаем');
  }
  manifest = parsed as Record<string, ManifestChunk>;

  const serviceWorker = readFileSync(resolve(OUT_DIR, 'sw.js'), 'utf8');
  // Записи манифеста в `sw.js`: `{url:"assets/...",revision:...}`. Кавычки
  // вокруг ключа зависят от минификации, поэтому допускаются оба вида.
  precached = [...serviceWorker.matchAll(/"?url"?\s*:\s*"([^"]+)"/g)].map((match) => match[1] ?? '');
  emitted = walk(OUT_DIR);
}, 180_000);

/** Лежит ли файл в precache-манифесте service worker'а. */
function isPrecached(file: string): boolean {
  return precached.includes(file) || precached.includes(`/${file}`);
}

describe('офлайн-доступность консоли', () => {
  it('оболочка приложения предзагружена и отдаётся на любой маршрут', () => {
    const serviceWorker = readFileSync(resolve(OUT_DIR, 'sw.js'), 'utf8');

    expect(isPrecached('index.html')).toBe(true);
    // Без навигационного отката адрес `/console/:id`, открытый без сети,
    // не получит оболочку, и предзагруженные чанки останутся невостребованы.
    expect(serviceWorker).toContain('createHandlerBoundToURL("/index.html")');
  });

  it('каждый чанк, от которого зависит консоль, предзагружен', () => {
    for (const file of consoleClosure()) {
      expect(
        isPrecached(file),
        `${file} не предзагружен: в зале без сети консоль откроется пустой`,
      ).toBe(true);
    }
  });

  it('ни один собранный чанк не потерян', () => {
    // Проверка шире предыдущей намеренно: чанк консоли может появиться под
    // любым именем и из любого маршрута, а `globPatterns` обещает весь набор.
    const code = emitted.filter(
      (file) => /\.(js|css|html)$/.test(file) && !/^(sw\.js|workbox-.*\.js)$/.test(file),
    );

    expect(code.length).toBeGreaterThan(0);
    expect(code.filter((file) => !isPrecached(file))).toEqual([]);
  });

  it('набор чанков консоли укладывается в бюджет', () => {
    const total = consoleClosure().reduce(
      (sum, file) => sum + gzipSync(readFileSync(resolve(OUT_DIR, file))).length,
      0,
    );

    expect(total, `набор консоли весит ${String(Math.round(total / 1024))} КБ gzip`).toBeLessThan(
      BUDGET_GZIP_BYTES,
    );
  });
});
