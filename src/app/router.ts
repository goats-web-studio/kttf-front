import { createRouter } from '@tanstack/react-router';

import { routeTree } from '@/routeTree.gen';

import type { RouterContext } from './router-context';

export function createAppRouter(context: RouterContext): AppRouter {
  return createRouter({
    routeTree,
    context,
    // Подгрузка маршрута начинается при наведении или касании, а не после
    // нажатия. На телефоне в зале это разница между «мгновенно» и «ждём».
    defaultPreload: 'intent',
    scrollRestoration: true,
  });
}

export type AppRouter = ReturnType<typeof createRouter<typeof routeTree, 'never', boolean>>;

declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter;
  }
}
