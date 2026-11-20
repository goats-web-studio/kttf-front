import { useEffect } from 'react';

import { reloadUser } from './session';
import { useSessionStore } from './session-store';

/** Чаще перечитывать незачем: роли выдают люди, а не таймеры. */
export const FRESH_USER_INTERVAL_MS = 30_000;

/**
 * Вошедший перечитывается при возвращении на вкладку — ADR-100.
 *
 * Роли в клубах приходят в сессии, а выдаёт их другой человек: владелец
 * добавил организатора, администратор завёл клуб по заявке. Без
 * перечитывания «Мои клубы» оставались пустыми до перезагрузки страницы,
 * и на пилоте человек решил, что клуба у него нет.
 */
export default function useFreshUser(): void {
  const signedIn = useSessionStore((state) => state.user !== null && state.accessToken !== null);

  useEffect(() => {
    if (!signedIn) return;

    let last = Date.now();

    const refresh = (): void => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - last < FRESH_USER_INTERVAL_MS) return;

      last = Date.now();
      // Фоновое обновление: не вышло — данные остаются прежними до
      // следующего возвращения. Протухший вход разбирает слой API сам.
      reloadUser().catch(() => undefined);
    };

    document.addEventListener('visibilitychange', refresh);
    globalThis.addEventListener('focus', refresh);

    return () => {
      document.removeEventListener('visibilitychange', refresh);
      globalThis.removeEventListener('focus', refresh);
    };
  }, [signedIn]);
}
