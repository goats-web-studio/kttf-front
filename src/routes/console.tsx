import { createFileRoute, Outlet } from '@tanstack/react-router';
import type { ReactNode } from 'react';

export const Route = createFileRoute('/console')({
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
