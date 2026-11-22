import { Suspense } from 'react';
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom';

import { AppShell } from './layout/AppShell';
import NotFoundPage from './pages/NotFoundPage';
import { routeRegistry, toRouteObjects } from './routes';
import type { ShellViewData } from './view-data';
import { ViewDataProvider } from './view-data';
import './shell.css';

function ShellLayout() {
  return (
    <AppShell>
      <Suspense fallback={<div className="shell-page" aria-busy="true" />}>
        <Outlet />
      </Suspense>
    </AppShell>
  );
}

const shellRouteObjects = [
  {
    element: <ShellLayout />,
    errorElement: (
      <AppShell>
        <NotFoundPage />
      </AppShell>
    ),
    children: [...toRouteObjects(routeRegistry), { path: '*', element: <NotFoundPage /> }],
  },
];

let router: ReturnType<typeof createBrowserRouter> | undefined;

/**
 * Kabuğun tamamı. `src/app/App.tsx` bunu sağlayıcıların içinde çizer.
 * `viewData` görünümlerin veri bağlantısıdır. Uygulama girişi API ile kurar.
 * Router modül düzeyinde bir kez kurulur.
 */
export function ShellApp({ viewData = null }: { viewData?: ShellViewData | null }) {
  router ??= createBrowserRouter(shellRouteObjects);
  return (
    <ViewDataProvider value={viewData}>
      <RouterProvider router={router} />
    </ViewDataProvider>
  );
}
