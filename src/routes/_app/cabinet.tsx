import { createFileRoute, Outlet } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import CabinetShell from '@/features/cabinet/cabinet-shell';

/** Каркас кабинета: боковое меню разделов и сам раздел — ADR-074. */
export const Route = createFileRoute('/_app/cabinet')({
  component: CabinetLayout,
});

function CabinetLayout(): ReactNode {
  return (
    <CabinetShell>
      <Outlet />
    </CabinetShell>
  );
}
