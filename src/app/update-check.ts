/** Как часто открытая вкладка спрашивает сервер о новой версии сайта. */
export const UPDATE_CHECK_MS = 5 * 60 * 1000;

/**
 * Проверка новой версии, пока вкладка открыта.
 *
 * Сам браузер проверяет работника службы только при загрузке страницы.
 * Вкладка, открытая с утра, узнавала о выкладке лишь после перезагрузки, и
 * подсказка «Доступна новая версия» не появлялась часами. Теперь вкладка
 * спрашивает раз в `intervalMs` и каждый раз, когда к ней возвращаются.
 * Без сети не спрашивает: консоль судьи в зале без Wi-Fi не должна сыпать
 * ошибками. Найденная версия по-прежнему ставится только по кнопке.
 */
export function watchForUpdates(
  registration: Pick<ServiceWorkerRegistration, 'update' | 'installing'>,
  intervalMs: number = UPDATE_CHECK_MS,
): () => void {
  const check = (): void => {
    if (!navigator.onLine || registration.installing !== null) {
      return;
    }
    registration.update().catch(() => undefined);
  };
  const onVisibility = (): void => {
    if (document.visibilityState === 'visible') {
      check();
    }
  };

  const timer = window.setInterval(check, intervalMs);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

/**
 * Кнопка «Обновить»: новая версия включается, и вкладка перезагружается.
 *
 * Плагин перезагружает вкладку только по смене управляющего работника, а
 * она бывает лишь у вкладки, которой уже управлял прежний работник. После
 * жёсткого обновления (Cmd+Shift+R) или при первом заходе вкладкой никто не
 * управляет, а `clientsClaim` нет намеренно: новая версия включалась, смены
 * не было — и кнопка «не срабатывала». Поэтому перезагружаем сами, как только
 * ждущий работник включился. Если ждущего уже нет — новую версию включила
 * другая вкладка — просто перезагружаем.
 */
export function applyUpdate(
  registration: Pick<ServiceWorkerRegistration, 'waiting'> | undefined,
  skipWaiting: () => void,
  reload: () => void = () => {
    window.location.reload();
  },
): void {
  const waiting = registration?.waiting ?? null;
  if (waiting === null) {
    reload();
    return;
  }
  waiting.addEventListener('statechange', () => {
    // `redundant` — ждущего сменила ещё более новая версия: перезагрузка
    // покажет её подсказку, а не оставит кнопку без ответа.
    if (waiting.state === 'activated' || waiting.state === 'redundant') {
      reload();
    }
  });
  skipWaiting();
}
