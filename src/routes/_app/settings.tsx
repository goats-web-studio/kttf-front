import { createFileRoute, Outlet } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import CabinetShell from '@/features/cabinet/cabinet-shell';

/** Настройки — в том же каркасе, что и кабинет: меню одно (ADR-074). */
export const Route = createFileRoute('/_app/settings')({
  component: SettingsShellLayout,
});

function SettingsShellLayout(): ReactNode {
  return (
    <CabinetShell>
      <Outlet />
    </CabinetShell>
  );
}
