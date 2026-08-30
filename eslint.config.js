import preset from '@kttf/shared/config/eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      'dist/**',
      'dev-dist/**',
      'coverage/**',
      // Дерево маршрутов генерируется плагином из содержимого src/routes.
      // Это чужой вывод: править его нельзя, а type-aware правила на нём
      // считаются впустую.
      'src/routeTree.gen.ts',
    ],
  },

  ...preset(import.meta.dirname),

  // Правила хуков — не стилистика. Нарушенный порядок вызовов ломает
  // состояние компонента способом, который не виден ни в типах, ни в тестах.
  reactHooks.configs.flat['recommended-latest'],
  reactRefresh.configs.vite,

  {
    // Файлы маршрутов устроены иначе, чем обычные компоненты: TanStack Router
    // требует от каждого экспорт `Route` с описанием маршрута, а переходы
    // выполняет броском `redirect()` — это Response, а не Error. Оба правила
    // справедливы для остального кода и здесь запрещали бы ровно тот способ,
    // которым фреймворк описывает маршрут.
    files: ['src/routes/**/*.tsx'],
    rules: {
      // Правило требует экспортировать компонент, иначе горячая замена его не
      // видит. Здесь это неприменимо: экспортированный компонент перестаёт
      // выноситься плагином в отдельный чанк — проверено, чанк маршрута
      // исчезает и уезжает в основной бандл. Ленивая загрузка маршрутов
      // консоли важнее удобства разработки: без неё рушатся и бюджет 400 КБ,
      // и precache офлайна (ADR-004, ТС 8.1).
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/only-throw-error': [
        'error',
        { allow: [{ from: 'lib', name: 'Response' }] },
      ],
    },
  },

  {
    // Скрипты обслуживания — обычный Node без типов, в проект TypeScript они
    // не входят. Так же поступает kttf-back со своими.
    files: ['scripts/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      globals: { Buffer: 'readonly', console: 'readonly', process: 'readonly' },
      parserOptions: { projectService: false, project: false },
    },
  },
];
