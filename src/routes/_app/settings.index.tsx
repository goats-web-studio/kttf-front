import { createFileRoute, redirect } from '@tanstack/react-router';

/** «Настройки» без раздела — профиль игрока: его правят чаще аккаунта. */
export const Route = createFileRoute('/_app/settings/')({
  beforeLoad: () => {
    throw redirect({ to: '/settings/profile', replace: true });
  },
});
