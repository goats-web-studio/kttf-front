import { createFileRoute, Outlet } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import SiteLayout from '@/features/shell/site-layout';

export const Route = createFileRoute('/_public')({
  component: PublicLayout,
});

/**
 * Публичная часть: рейтинги, календарь, клубы, профили, результаты (ТЗ 9).
 *
 * Открыта без авторизации целиком — критерий готовности MVP требует, чтобы
 * страница результатов открывалась без входа. Шапка общая с кабинетом.
 */
function PublicLayout(): ReactNode {
  return (
    <SiteLayout>
      <Outlet />
    </SiteLayout>
  );
}
