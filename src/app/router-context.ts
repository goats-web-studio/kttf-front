import type { AuthUserView } from '@kttf/shared/types';
import type { QueryClient } from '@tanstack/react-query';

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
  /**
   * Вошедший пользователь либо `null`.
   *
   * Тип общий с бэкендом — это ровно то, что возвращает ТС 7.1. Охрана
   * маршрутов кабинета смотрит только на наличие, состав нужен экранам.
   */
  readonly session: AuthUserView | null;
}
