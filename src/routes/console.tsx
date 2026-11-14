import Box from '@mui/material/Box';
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import ThemeRoot from '@/common/ui/theme';

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
    // Светлая тема, как во всём продукте: владелец продукта счёл тёмную
    // консоль чужеродной (октябрь 2026). Зал обычно освещён, и белый экран
    // планшета читается не хуже тёмного.
    <ThemeRoot>
      <Box
        sx={{
          display: 'flex',
          // Не height: лента консоли длиннее экрана, и ниже первого экрана
          // просвечивал бы светлый фон страницы.
          minHeight: '100dvh',
          flexDirection: 'column',
          bgcolor: 'background.default',
          color: 'text.primary',
          // Фон сайта, облегчённый: тёплые пятна и сетка точек — одним CSS,
          // без рисунка столов. Консоль — часть KTTF, а не чужая программа,
          // но её набор упирается в бюджет 420 КБ gzip (ТС 8.1,
          // `precache.test.ts`): сам `SiteBackdrop` с его SVG сюда не влез бы.
          backgroundImage: [
            'radial-gradient(ellipse 900px 620px at 88% 12%, var(--red-50) 0, transparent 70%)',
            'radial-gradient(ellipse 820px 600px at 6% 60%, var(--gold-50) 0, transparent 70%)',
            'radial-gradient(circle at 2px 2px, color-mix(in srgb, var(--ink-300) 45%, transparent) 1.2px, transparent 1.3px)',
          ].join(', '),
          backgroundSize: '100% 100%, 100% 100%, 24px 24px',
          backgroundAttachment: 'fixed',
        }}
      >
        <Outlet />
      </Box>
    </ThemeRoot>
  );
}
