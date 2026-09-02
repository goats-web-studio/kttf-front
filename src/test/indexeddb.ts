import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';

/**
 * IndexedDB для тестов — jsdom её не реализует.
 *
 * Консоль судьи держит в ней снимок турнира и очередь операций (ТС 6.2),
 * поэтому без заглушки не открывается ни один экран консоли.
 */
export function setupIndexedDB(): void {
  globalThis.indexedDB = new IDBFactory();
  globalThis.IDBKeyRange = IDBKeyRange;
}

/** Чистая база между тестами: очередь предыдущего теста не должна протекать. */
export function resetIndexedDB(): void {
  setupIndexedDB();
}
