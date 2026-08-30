import { tanstackRouter } from '@tanstack/router-plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/** Куда дев-сервер проксирует API. Прод собирается под один origin с бэкендом. */
const API_TARGET = 'http://localhost:3000';

export default defineConfig({
  plugins: [
    // Плагин обязан идти до React: он генерирует дерево маршрутов, которое
    // React-плагин затем обрабатывает как обычный код.
    tanstackRouter({
      target: 'react',
      // Компоненты маршрутов выносятся в отдельные чанки автоматически.
      // Для консоли это не удобство, а требование ADR-004: её маршруты
      // грузятся лениво и попадают в precache отдельными файлами.
      autoCodeSplitting: true,
      routesDirectory: 'src/routes',
      generatedRouteTree: 'src/routeTree.gen.ts',
    }),
    react(),
    tailwindcss(),
    VitePWA({
      // Не autoUpdate. Автообновление перезагружает вкладку в момент выкатки,
      // а в этот момент судья может вести турнир — приоритет №2 брифа.
      // Момент обновления выбирает человек.
      registerType: 'prompt',
      workbox: {
        // Precache всего собранного набора, а не перечня файлов. Чанки консоли
        // попадают в него по построению: ленивый чанк без предзагрузки в
        // офлайне недоступен, и судья получит пустой экран в зале без сети.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        // Запросы к API не должны подменяться оболочкой приложения.
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'KTTF — настольный теннис Казахстана',
        short_name: 'KTTF',
        description:
          'Турниры, рейтинг и календарь настольного тенниса Казахстана. Консоль судьи работает без интернета.',
        lang: 'ru',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Бэкенд отдаёт API без CORS и менять его в этой задаче нельзя.
    // В деве фронт и API живут на одном origin за счёт прокси, в проде —
    // за счёт общего домена на Caddy. CORS не нужен ни там, ни там.
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
    },
  },
});
