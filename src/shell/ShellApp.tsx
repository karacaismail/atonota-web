import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom';

import { AppShell } from './layout/AppShell';
import { CollectionPage } from './pages/CollectionPage';
import { RecordPage } from './pages/RecordPage';
import { AgentPage, AssistantPage, HomePage, NotFoundPage } from './pages/SimplePages';
import { routePaths } from './routes';
import './shell.css';

function ShellLayout() {
  return (
    <AppShell>
      <Outlet />
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
    children: [
      { index: true, element: <HomePage /> },
      { path: routePaths.assistant, element: <AssistantPage /> },
      { path: routePaths.agent, element: <AgentPage /> },
      { path: routePaths.collection, element: <CollectionPage /> },
      { path: routePaths.record, element: <RecordPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
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
