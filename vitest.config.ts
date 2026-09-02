import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Тесты не поднимают плагины сборки: дерево маршрутов лежит в репозитории
 * готовым файлом, а service worker в тестах не нужен и только мешает.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Виртуальный модуль плагина PWA существует только в сборке. Без
      // заглушки не собирается ни один тест, рендерящий приложение целиком.
      'virtual:pwa-register/react': fileURLToPath(
        new URL('./src/test/pwa-register-stub.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
