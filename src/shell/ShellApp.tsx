import { Suspense } from 'react';
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom';

import { AppShell } from './layout/AppShell';
import NotFoundPage from './pages/NotFoundPage';
import { routeRegistry, toRouteObjects } from './routes';
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
 * Router modül düzeyinde bir kez kurulur.
 */
export function ShellApp() {
  router ??= createBrowserRouter(shellRouteObjects);
  return <RouterProvider router={router} />;
}
