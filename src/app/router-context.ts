import type { QueryClient } from '@tanstack/react-query';

import type { Session } from '@/common/session/session';

/**
 * Контекст роутера.
 *
 * Заводится сразу, хотя пользователей у него пока двое. Причина в цене
 * обратного шага: контекст доступен в `beforeLoad` и в загрузчиках каждого
 * маршрута, и добавление его позже правит каждый файл в `src/routes`, а к MVP
 * их будут десятки.
 */
export interface RouterContext {
  readonly queryClient: QueryClient;
  /** `null` — не вошёл. Охрана маршрутов кабинета смотрит только на это. */
  readonly session: Session | null;
}
