/**
 * Сигнал «человек перешёл на другую страницу».
 *
 * Подсказка об обновлении живёт над маршрутами, вне роутера, — роутер
 * заводится только после восстановления сессии. Маршруты сообщают о переходе
 * сюда, подсказка слушает.
 */
type Listener = (pathname: string) => void;

const listeners = new Set<Listener>();

export function notifyNavigated(pathname: string): void {
  for (const listener of listeners) {
    listener(pathname);
  }
}

export function onNavigated(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
