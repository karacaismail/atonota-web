import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { collectionRoutes, lazyRoutes } from './routes';
import { buildShellRoutes } from './shellRoutes';
import type { ShellViewData } from './view-data';
import { ViewDataProvider } from './view-data';
import './shell.css';

let router: ReturnType<typeof createBrowserRouter> | undefined;

/**
 * Kabuğun tamamı. `src/app/App.tsx` bunu sağlayıcıların içinde çizer.
 * `viewData` görünümlerin veri bağlantısıdır. Uygulama girişi API ile kurar.
 * Router modül düzeyinde bir kez kurulur.
 */
export function ShellApp({ viewData = null }: { viewData?: ShellViewData | null }) {
  router ??= createBrowserRouter(buildShellRoutes(lazyRoutes, collectionRoutes));
  return (
    <ViewDataProvider value={viewData}>
      <RouterProvider router={router} />
    </ViewDataProvider>
  );
}
