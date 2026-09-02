import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Precache чанков консоли — ADR-004, ТС 8.1.
 *
 * Ленивый чанк, не предзагруженный service worker'ом, в офлайне недоступен:
 * судья откроет консоль в зале без сети и получит пустой экран. Это самый
 * вероятный способ сломать офлайн-режим в единой сборке, и ADR-004 требует
 * закрыть его тестом.
 *
 * Проверяется собранный `dist`, а не конфигурация: `globPatterns` можно
 * оставить прежним и всё равно потерять чанк — например, вынеся консоль
 * в отдельную точку входа. Без сборки проверять нечего, поэтому тест
 * пропускается: `pnpm build` перед `pnpm test` делает CI.
 */

// Каталог сборки от корня пакета: тесты запускаются из него.
const dist = resolve(process.cwd(), 'dist');
const serviceWorker = resolve(dist, 'sw.js');
const HAS_BUILD = existsSync(serviceWorker);

/** Файлы, попавшие в precache: их перечисляет манифест внутри `sw.js`. */
function precached(): string[] {
  const source = readFileSync(serviceWorker, 'utf8');

  return [...source.matchAll(/url:"([^"]+)"/g)].map((match) => match[1] ?? '');
}

/** Чанки консоли в сборке: по имени файла — их выделяет разбиение маршрутов. */
function consoleChunks(): string[] {
  return readdirSync(resolve(dist, 'assets')).filter(
    (name) => name.includes('console') && name.endsWith('.js'),
  );
}

describe('офлайн-доступность консоли', () => {
  it.skipIf(!HAS_BUILD)('оболочка приложения предзагружена', () => {
    expect(precached().some((url) => url.endsWith('index.html'))).toBe(true);
  });

  it.skipIf(!HAS_BUILD)('каждый чанк консоли лежит в precache', () => {
    const urls = precached();
    const chunks = consoleChunks();

    // Пустой список означал бы, что чанки перестали выделяться по имени,
    // и тест молча проверял бы пустоту.
    expect(chunks.length).toBeGreaterThan(0);

    for (const chunk of chunks) {
      expect(
        urls.some((url) => url.endsWith(chunk)),
        `${chunk} не предзагружен: в зале без сети консоль откроется пустой`,
      ).toBe(true);
    }
  });
});
