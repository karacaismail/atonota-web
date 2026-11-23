import type { LoaderFunctionArgs, RouteObject } from 'react-router-dom';
import { data } from 'react-router-dom';

import { AppShell } from './layout/AppShell';
import { ShellLayout } from './layout/ShellLayout';
import NotFoundPage from './pages/NotFoundPage';
import { RouteErrorPage } from './pages/RouteErrorPage';
import type { RouteEntry } from './routes';
import { isReservedSegment, toRouteObjects } from './routes';

/** Ayrılmış önekler (`/_demo/`, `/panel/`) koleksiyon sayfasına düşmez. 404 verir. */
function guardReserved({ params }: LoaderFunctionArgs) {
  if (isReservedSegment(params['module'])) throw data(null, { status: 404 });
  return null;
}

/**
 * Kabuğun router kayıtları.
 * Önce `lazy` satırları gelir, sonra koleksiyon yolları, en sonda 404.
 * Her sayfanın kendi hata ekranı vardır. Böylece hata olunca kabuk yerinde kalır.
 */
export function buildShellRoutes(lazy: RouteEntry[], collection: RouteEntry[]): RouteObject[] {
  const withError = (o: RouteObject): RouteObject => ({ ...o, errorElement: <RouteErrorPage /> });
  return [
    {
      element: <ShellLayout />,
      errorElement: (
        <AppShell>
          <RouteErrorPage />
        </AppShell>
      ),
      children: [
        ...toRouteObjects(lazy).map(withError),
        ...toRouteObjects(collection).map((o) => ({ ...withError(o), loader: guardReserved })),
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ];
}
