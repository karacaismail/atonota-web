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
 * Router derlemenin adres yolunda çalışır: canlıda `/panel`, yerelde kök yol.
 */
export function ShellApp({ viewData = null }: { viewData?: ShellViewData | null }) {
  // `/panel/` -> `/panel`; kök yolda basename yoktur. Kural `src/app/base-path.ts` ile aynıdır.
  // Yardımcı buraya alınmaz: kabuk parçası ile giriş parçası arasında ayrı küçük parça oluşurdu.
  const basename = import.meta.env.BASE_URL.replace(/\/+$/, '') || undefined;
  router ??= createBrowserRouter(
    buildShellRoutes(lazyRoutes, collectionRoutes),
    basename ? { basename } : undefined,
  );
  return (
    <ViewDataProvider value={viewData}>
      <RouterProvider router={router} />
    </ViewDataProvider>
  );
}
