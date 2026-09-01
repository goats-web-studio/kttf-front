import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import type { ReactNode } from 'react';

export const Route = createFileRoute('/console')({
  /**
   * Консоль требует входа: каждое её действие уходит с токеном, а без него
   * сервер отвергнет и назначение на стол, и ввод счёта. Показывать судье
   * рабочий экран, который откажет на первом же касании, — хуже, чем
   * попросить войти.
   */
  beforeLoad: ({ context, location }) => {
    if (context.session === null) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
  },
  component: ConsoleLayout,
});

/**
 * Оболочка консоли судьи.
 *
 * Отдельная ветка маршрутов, а не раздел публичной части, и это не вопрос
 * оформления. Всё, что попадает сюда, уезжает в чанки консоли и считается
 * против бюджета 400 КБ (ТС 8.1), а сами чанки обязаны быть в precache —
 * иначе судья откроет консоль в зале без сети и увидит пустой экран
 * (ADR-004). Импортировать что-либо из публичных фич отсюда нельзя.
 *
 * Содержимое приходит в спринте 3 — ТС 9, требования в ТЗ 6.
 */
function ConsoleLayout(): ReactNode {
  return (
    <div className="flex h-full flex-col bg-slate-900 text-white">
      <Outlet />
    </div>
  );
}
