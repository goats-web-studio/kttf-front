/**
 * Заглушка виртуального модуля плагина PWA.
 *
 * `virtual:pwa-register/react` создаёт плагин во время сборки, а тесты
 * плагины не поднимают — см. `vitest.config.ts`. Без заглушки не собирается
 * ни один тест, который рендерит приложение целиком: `App` тянет за собой
 * подсказку об обновлении.
 *
 * Работник службы в тестах не проверяется: он поведение приложения не меняет,
 * а его наличие в собранном наборе стережёт отдельный тест precache.
 */
export function useRegisterSW(): {
  needRefresh: [boolean, (value: boolean) => void];
  updateServiceWorker: (reload?: boolean) => Promise<void>;
} {
  return {
    needRefresh: [false, () => undefined],
    updateServiceWorker: () => Promise.resolve(),
  };
}
