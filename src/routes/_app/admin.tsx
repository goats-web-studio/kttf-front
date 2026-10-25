import { createFileRoute, Outlet } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import AdminShell from '@/features/admin/admin-shell';

/** Администрирование — отдельный модуль со своим меню (ADR-075). */
export const Route = createFileRoute('/_app/admin')({
  component: AdminLayout,
});

function AdminLayout(): ReactNode {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
